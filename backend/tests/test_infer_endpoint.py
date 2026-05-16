"""POST /api/infer-events 통합 테스트."""
from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _iso(minutes_ago: int = 0) -> str:
    return (datetime.now() - timedelta(minutes=minutes_ago)).isoformat()


def test_infer_endpoint_returns_user_returned_for_door_unlock():
    res = client.post(
        "/api/infer-events",
        json={
            "readings": [
                {
                    "sensor_id": "door_lock",
                    "state": {"state": "unlocked", "side": "out"},
                    "ts": _iso(2),
                }
            ],
            "current_time": "19:30",
            "weekday": 1,
            "sleep_time": "23:00",
            "mode": "hybrid",
        },
    )
    assert res.status_code == 200
    body = res.json()
    ids = [e["event_id"] for e in body["inferred_events"]]
    assert "user_returned" in ids


def test_infer_endpoint_empty_readings_returns_empty():
    res = client.post(
        "/api/infer-events",
        json={
            "readings": [],
            "current_time": "12:00",
            "weekday": 2,
        },
    )
    assert res.status_code == 200
    assert res.json()["inferred_events"] == []


def test_infer_endpoint_invalid_time_returns_422():
    res = client.post(
        "/api/infer-events",
        json={"readings": [], "current_time": "25:00", "weekday": 0},
    )
    assert res.status_code == 422


def test_infer_endpoint_invalid_weekday_returns_422():
    res = client.post(
        "/api/infer-events",
        json={"readings": [], "current_time": "12:00", "weekday": 9},
    )
    assert res.status_code == 422


def test_infer_endpoint_motion_sensor_sets_user_location_hint():
    res = client.post(
        "/api/infer-events",
        json={
            "readings": [
                {
                    "sensor_id": "motion_sensor",
                    "state": {},
                    "ts": _iso(1),
                    "room_id": "kitchen",
                }
            ],
            "current_time": "19:30",
            "weekday": 1,
        },
    )
    assert res.status_code == 200
    assert res.json()["user_location_hint"] == "kitchen"


def test_simulate_with_sensor_readings_works():
    """v2 — /api/simulate에 sensor_readings 전달 시 inference → scoring 체인."""
    res = client.post(
        "/api/simulate",
        json={
            "sensor_readings": [
                {
                    "sensor_id": "door_lock",
                    "state": {"state": "unlocked", "side": "out"},
                    "ts": _iso(1),
                },
                {
                    "sensor_id": "weather_api",
                    "state": {"condition": "rain"},
                    "ts": _iso(1),
                },
            ],
            "custom": {
                "current_time": "20:30",
                "sleep_time": "23:00",
            },
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert "rooms" in body
    # 비 + 귀가 추론 → 현관 final score는 base(30) + rain(20) + user_returned(15) = 65 이상
    entrance = next(r for r in body["rooms"] if r["room_id"] == "entrance")
    assert entrance["final"] >= 60
    # IoT 추론 라벨이 summary에 포함
    assert "IoT" in body["context_summary"]


def test_simulate_rejects_scenario_and_sensors_together():
    res = client.post(
        "/api/simulate",
        json={
            "scenario_id": "rainy_return",
            "sensor_readings": [],
        },
    )
    assert res.status_code == 400
