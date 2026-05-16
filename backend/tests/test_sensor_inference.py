"""SensorInferenceEngine 단위 테스트 — docs/IOT_DOMAIN.md §3 13개 규칙."""
from datetime import datetime, timedelta

from app.data_loader import load_inference_engine
from app.schemas.sensor import SensorReading

engine = load_inference_engine()


def _reading(sensor_id: str, state: dict, *, minutes_ago: int = 0, room_id: str | None = None) -> SensorReading:
    return SensorReading(
        sensor_id=sensor_id,
        state=state,
        ts=datetime.now() - timedelta(minutes=minutes_ago),
        room_id=room_id,
    )


def _evaluate(readings, current_time="19:30", weekday=1, sleep_time="23:00"):
    return engine.evaluate(readings, current_time, weekday, sleep_time)


def test_engine_loads_13_rules():
    assert len(engine.rules) == 13


def test_door_lock_unlock_outside_triggers_user_returned():
    events = _evaluate([_reading("door_lock", {"state": "unlocked", "side": "out"})])
    ids = [e.event_id for e in events]
    assert "user_returned" in ids


def test_door_lock_lock_outside_triggers_user_left():
    events = _evaluate([_reading("door_lock", {"state": "locked", "side": "out"})])
    assert "user_left" in [e.event_id for e in events]


def test_induction_active_5min_triggers_cooking_active():
    events = _evaluate([_reading("induction", {"state": "on", "duration_min": 6})])
    assert "cooking_active" in [e.event_id for e in events]


def test_induction_active_below_5min_does_not_trigger():
    events = _evaluate([_reading("induction", {"state": "on", "duration_min": 3})])
    assert "cooking_active" not in [e.event_id for e in events]


def test_induction_off_transition_triggers_cooking_done():
    events = _evaluate(
        [_reading("induction", {"state": "off", "transition_from": "on", "prev_on_within_min": 10})]
    )
    assert "cooking_done" in [e.event_id for e in events]


def test_microwave_2min_triggers_cooking_active_medium():
    events = _evaluate([_reading("microwave", {"state": "on", "duration_min": 3})])
    e = next(e for e in events if e.event_id == "cooking_active")
    assert e.confidence > 0


def test_bed_sensor_with_sleep_in_30min_triggers_pre_sleep_30min():
    # current_time 22:35, sleep_time 23:00 → 25분 남음
    events = _evaluate(
        [_reading("bed_sensor", {"occupied": True})],
        current_time="22:35",
        sleep_time="23:00",
    )
    assert "pre_sleep_30min" in [e.event_id for e in events]


def test_bed_sensor_with_sleep_far_does_not_trigger_30min():
    # 시간 14:00, 취침 23:00 → 9시간 — 30min 조건 미충족
    events = _evaluate(
        [_reading("bed_sensor", {"occupied": True})],
        current_time="14:00",
        sleep_time="23:00",
    )
    assert "pre_sleep_30min" not in [e.event_id for e in events]


def test_tv_30min_triggers_tv_watching():
    events = _evaluate([_reading("tv", {"state": "on", "duration_min": 31})])
    assert "tv_watching" in [e.event_id for e in events]


def test_humidity_bath_spike_triggers_recent_shower():
    events = _evaluate(
        [_reading("humidity_bath", {"rh": 85, "rh_delta_last_10min": 25})]
    )
    assert "recent_shower" in [e.event_id for e in events]


def test_weather_rain_triggers_rain_event():
    events = _evaluate([_reading("weather_api", {"condition": "rain"})])
    assert "rain" in [e.event_id for e in events]
    rain = next(e for e in events if e.event_id == "rain")
    assert rain.confidence == 1.0  # deterministic


def test_refrigerator_frequent_open_triggers_meal_prep():
    events = _evaluate([_reading("refrigerator", {"open_count_last_1h": 5})])
    assert "meal_prep" in [e.event_id for e in events]


def test_calendar_guest_within_2h_triggers_guest_arriving():
    events = _evaluate(
        [_reading("calendar", {"upcoming_event_tag": "guest", "within_min": 60})]
    )
    assert "guest_arriving_2h" in [e.event_id for e in events]


def test_motion_sensor_provides_user_location_hint():
    hint = engine.user_location_hint(
        [_reading("motion_sensor", {}, room_id="bedroom", minutes_ago=1)]
    )
    assert hint == "bedroom"


def test_motion_sensor_picks_latest_when_multiple():
    hint = engine.user_location_hint(
        [
            _reading("motion_sensor", {}, room_id="kitchen", minutes_ago=10),
            _reading("motion_sensor", {}, room_id="living", minutes_ago=2),
        ]
    )
    assert hint == "living"


def test_dedup_keeps_max_confidence_and_merges_triggers():
    # induction 5min + microwave 3min → 둘 다 cooking_active 트리거 (high + medium)
    events = _evaluate(
        [
            _reading("induction", {"state": "on", "duration_min": 6}),
            _reading("microwave", {"state": "on", "duration_min": 3}),
        ]
    )
    ca = [e for e in events if e.event_id == "cooking_active"]
    assert len(ca) == 1  # dedup
    # confidence는 high(0.9)가 medium(0.6)보다 우선
    assert ca[0].confidence == 0.9
    # triggered_by에 두 규칙 모두
    assert "R-COOK-ACTIVE-1" in ca[0].triggered_by
    assert "R-COOK-ACTIVE-2" in ca[0].triggered_by


def test_empty_readings_returns_empty_list():
    assert _evaluate([]) == []


def test_events_sorted_by_confidence_desc():
    events = _evaluate(
        [
            _reading("microwave", {"state": "on", "duration_min": 3}),  # medium 0.6
            _reading("door_lock", {"state": "unlocked", "side": "out"}),  # high 0.9
            _reading("weather_api", {"condition": "rain"}),  # deterministic 1.0
        ]
    )
    confidences = [e.confidence for e in events]
    assert confidences == sorted(confidences, reverse=True)
