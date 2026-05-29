import logging
import time
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.data_loader import (
    load_events,
    load_inference_engine,
    load_rooms,
    load_rules,
    load_scenarios,
)
from app.schemas.sensor import SensorReading
from app.schemas.simulation import (
    CustomContext,
    InferredEventInfo,
    SimulateRequest,
    SimulateResponse,
)
from app.services import cache, llm_explainer
from app.services.context_builder import (
    ScoringContext,
    build_context,
    build_custom_context,
)
from app.services.scoring import compute_scores

router = APIRouter()
log = logging.getLogger(__name__)

_EVENT_TO_SENSORS: dict[str, list[dict]] = {
    "user_returned": [
        {"sensor_id": "door_lock", "state": {"state": "unlocked", "side": "out"}, "room_id": "entrance"},
    ],
    "user_left": [
        {"sensor_id": "door_lock", "state": {"state": "locked", "side": "out"}, "room_id": "entrance"},
    ],
    "cooking_active": [
        {"sensor_id": "induction", "state": {"state": "on", "duration_min": 15}, "room_id": "kitchen"},
    ],
    "cooking_done": [
        {"sensor_id": "induction", "state": {"state": "off", "transition_from": "on", "prev_on_min": 20}, "room_id": "kitchen"},
    ],
    "pre_sleep_30min": [
        {"sensor_id": "bed_sensor", "state": {"occupied": True}, "room_id": "bedroom"},
    ],
    "pre_sleep_2h": [
        {"sensor_id": "bed_sensor", "state": {"occupied": False}, "room_id": "bedroom"},
    ],
    "rain": [
        {"sensor_id": "weather_api", "state": {"condition": "rain", "last_1h_rain_mm": 5.0}},
    ],
    "guest_arriving_2h": [
        {"sensor_id": "calendar", "state": {"upcoming_event_tag": "guest", "minutes_until": 90}},
    ],
    "meal_prep": [
        {"sensor_id": "refrigerator", "state": {"open_count_last_1h": 5}, "room_id": "kitchen"},
    ],
    "package_delivery": [
        {"sensor_id": "door_lock", "state": {"state": "unlocked", "side": "out"}, "room_id": "entrance"},
    ],
    "meal_finished": [
        {"sensor_id": "induction", "state": {"state": "off", "transition_from": "on", "prev_on_min": 20}, "room_id": "kitchen"},
        {"sensor_id": "refrigerator", "state": {"open_count_last_1h": 5}, "room_id": "kitchen"},
    ],
}


def _synthesize_readings(
    active_events: list[str], current_time: str,
) -> list[SensorReading]:
    ts = datetime.now().replace(
        hour=int(current_time.split(":")[0]),
        minute=int(current_time.split(":")[1]),
        second=0, microsecond=0,
    )
    readings: list[SensorReading] = []
    seen: set[tuple[str, str]] = set()
    for eid in active_events:
        for s in _EVENT_TO_SENSORS.get(eid, []):
            key = (s["sensor_id"], str(s["state"]))
            if key in seen:
                continue
            seen.add(key)
            readings.append(SensorReading(
                sensor_id=s["sensor_id"],
                state=s["state"],
                ts=ts,
                room_id=s.get("room_id"),
            ))
    return readings


def _infer_for_scenario(
    active_events: list[str], current_time: str, sleep_time: str,
) -> list[InferredEventInfo]:
    readings = _synthesize_readings(active_events, current_time)
    if not readings:
        return []
    try:
        engine = load_inference_engine()
        rule_events = engine.evaluate(
            readings=readings, current_time=current_time,
            weekday=datetime.now().weekday(), sleep_time=sleep_time,
        )
        return [
            InferredEventInfo(event_id=e.event_id, confidence=e.confidence, source=e.source)
            for e in rule_events if not e.event_id.startswith("_")
        ]
    except Exception:
        log.warning("rule inference skipped for scenario", exc_info=True)
        return []


def _run(
    ctx: ScoringContext,
    t0: float,
    summary: str,
    cache_key: str | None,
    inferred_events: list[InferredEventInfo] | None = None,
) -> SimulateResponse:
    """scoring → cache hit 우선 → LLM. 시나리오/custom 공통 hot path."""
    scores = compute_scores(ctx, load_rooms(), load_rules())

    if cache_key is not None:
        cached = cache.get(cache_key)
        if cached:
            merged = {k: v for k, v in cached.items() if k not in ("duration_ms", "inferred_events")}
            return SimulateResponse(
                **merged,
                duration_ms=int((time.perf_counter() - t0) * 1000),
                inferred_events=inferred_events or [],
            )
    explanation, fallback = llm_explainer.generate_explanation(summary, scores)
    response = SimulateResponse(
        scenario_id=ctx.scenario.id,
        context_summary=summary,
        rooms=scores,
        explanation=explanation,
        fallback=fallback,
        duration_ms=int((time.perf_counter() - t0) * 1000),
        inferred_events=inferred_events or [],
    )
    if cache_key is not None and not fallback:
        payload = response.model_dump()
        payload.pop("duration_ms", None)
        payload.pop("inferred_events", None)
        cache.put(cache_key, payload)
    return response


@router.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest) -> SimulateResponse:
    mode_count = sum(x is not None for x in (req.scenario_id, req.custom, req.sensor_readings))
    if mode_count == 0:
        raise HTTPException(
            400, "one of scenario_id / custom / sensor_readings is required"
        )
    if req.scenario_id is not None and (req.custom is not None or req.sensor_readings is not None):
        raise HTTPException(400, "scenario_id cannot be combined with custom or sensor_readings")

    t0 = time.perf_counter()
    events = load_events()

    if req.scenario_id is not None:
        scenarios = load_scenarios()
        if req.scenario_id not in scenarios:
            raise HTTPException(404, f"unknown scenario: {req.scenario_id}")
        ctx = build_context(req.scenario_id, scenarios, events)
        summary = (
            f"{ctx.scenario.name_ko} · 시각 {ctx.scenario.current_time}"
            f" · 취침예정 {ctx.scenario.sleep_time}"
        )
        inferred = _infer_for_scenario(
            ctx.scenario.active_events, ctx.scenario.current_time, ctx.scenario.sleep_time,
        )
        return _run(ctx, t0, summary, cache.cache_key(req.scenario_id), inferred_events=inferred)

    # v2 — sensor_readings 경로: inference → custom으로 합쳐 기존 scoring 호출
    inferred_info: list[InferredEventInfo] = []
    if req.sensor_readings is not None:
        custom, inferred_info = _custom_from_sensors(req)
    else:
        custom = req.custom

    unknown = [eid for eid in custom.active_events if eid not in events]
    if unknown:
        raise HTTPException(400, f"unknown event id(s): {unknown}")
    ctx = build_custom_context(custom, events)
    label = "IoT 센서 추론" if req.sensor_readings is not None else "직접 입력"
    summary = (
        f"{label} · 시각 {custom.current_time}"
        f" · 취침예정 {custom.sleep_time}"
    )
    return _run(ctx, t0, summary, cache_key=None, inferred_events=inferred_info)


def _custom_from_sensors(
    req: SimulateRequest,
) -> tuple[CustomContext, list[InferredEventInfo]]:
    """sensor_readings → rule 추론 → CustomContext + 추론 결과."""
    engine = load_inference_engine()
    override = req.custom

    now = datetime.now()
    current_time = override.current_time if override else f"{now.hour:02d}:{now.minute:02d}"
    sleep_time = override.sleep_time if override else "23:00"

    rule_events = [
        e for e in engine.evaluate(
            readings=req.sensor_readings, current_time=current_time,
            weekday=now.weekday(), sleep_time=sleep_time,
        ) if not e.event_id.startswith("_")
    ]

    inferred_info = [
        InferredEventInfo(event_id=e.event_id, confidence=e.confidence, source=e.source)
        for e in rule_events
    ]
    sensor_event_ids = list(dict.fromkeys(e.event_id for e in rule_events))

    # custom.active_events가 있으면 합집합
    explicit_events = list(override.active_events) if override else []
    merged_events = list(dict.fromkeys(explicit_events + sensor_event_ids))

    # user_location: override 우선, 없으면 ML 위치 추정 (confidence fallback 포함)
    user_location = override.user_location if override and override.user_location else None
    if user_location is None:
        from app.data_loader import load_location_estimator

        est = load_location_estimator().estimate(req.sensor_readings, current_time)
        # away 는 방이 아니므로 점유 페널티 대상에서 제외 (user_location=None 처리)
        user_location = est.user_room if est.user_room in load_rooms() else None

    gap_rooms = list(override.gap_rooms) if override else []
    custom = CustomContext(
        current_time=current_time,
        sleep_time=sleep_time,
        user_location=user_location,
        active_events=merged_events,
        gap_rooms=gap_rooms,
    )
    return custom, inferred_info
