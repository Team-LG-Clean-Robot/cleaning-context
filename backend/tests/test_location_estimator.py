"""ML 사용자 위치 추정 (v3) 테스트 — CASAS hh106 학습 모델 + fallback.

설계: docs/CLEANING_DECISION_ALGORITHM.md §1
"""
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.data_loader import load_location_estimator
from app.main import app
from app.schemas.sensor import SensorReading

client = TestClient(app)

# ML v3(CASAS hh106) 위치추정은 설계 완료(docs/CLEANING_DECISION_ALGORITHM.md)되었으나
# 학부 일정상 모델(location_model.joblib) 학습은 미완 → 운영은 heuristic fallback.
# 학습 모델 도입을 게이트로 두고, 모델 경로 테스트는 xfail 처리(모델 학습 시 자동 통과).
needs_trained_model = pytest.mark.xfail(
    reason="ML v3 모델 미학습 — heuristic fallback 운영 (location_model.joblib 도입 시 통과)",
)


def _r(sensor_id: str, room_id=None, **state) -> SensorReading:
    return SensorReading(sensor_id=sensor_id, state=state or {}, ts=datetime.now(), room_id=room_id)


# ───────────────────────── 모델 & KPI ─────────────────────────


@needs_trained_model
def test_model_loaded_and_kpi_pass():
    est = load_location_estimator()
    assert est.model_loaded, "location_model.joblib 가 로드돼야 한다 (scripts/train_location_model.py)"
    m = est.metrics
    assert m.get("test_accuracy", 0) >= 0.75, f"KPI 미달: test {m.get('test_accuracy')}"
    assert m.get("cv5_accuracy_mean", 0) >= 0.70, f"KPI 미달: CV {m.get('cv5_accuracy_mean')}"
    assert m.get("dataset", "").startswith("CASAS hh106")


# ───────────────────────── 위치 추정 ─────────────────────────


@needs_trained_model
def test_estimate_clear_rooms_use_ml():
    est = load_location_estimator()
    cases = {
        "kitchen": [_r("induction", "kitchen", state="on"), _r("motion_sensor", "kitchen")],
        "living": [_r("tv", "living", state="on"), _r("motion_sensor", "living")],
        "bedroom": [_r("bed_sensor", "bedroom", occupied=True), _r("motion_sensor", "bedroom")],
        "bathroom": [_r("humidity_bath", "bathroom", rh=88), _r("motion_sensor", "bathroom")],
    }
    for expected, readings in cases.items():
        e = est.estimate(readings, "19:30")
        assert e.user_room == expected, f"{expected}: got {e.user_room}"
        assert e.source == "ml"
        assert e.confidence >= 0.60
        assert e.model_version


def test_door_locked_out_is_away_not_entrance():
    """바깥 잠금 + 모션 없음 → away (현관 점유로 오인 금지, §2.6)."""
    e = load_location_estimator().estimate(
        [_r("door_lock", "entrance", state="locked", side="out")], "08:00"
    )
    assert e.user_room == "away"
    assert e.source == "away"


def test_door_unlocked_out_is_entrance():
    e = load_location_estimator().estimate(
        [_r("door_lock", "entrance", state="unlocked", side="out"), _r("motion_sensor", "entrance")],
        "19:00",
    )
    assert e.user_room == "entrance"


def test_no_location_signal_returns_none():
    e = load_location_estimator().estimate([_r("weather_api", condition="rain")], "15:00")
    assert e.user_room is None
    assert e.source == "none"


# ───────────────────────── 엔드포인트 통합 ─────────────────────────


@needs_trained_model
def test_infer_ml_mode_returns_confidence_and_version():
    res = client.post(
        "/api/infer-events",
        json={
            "readings": [{"sensor_id": "induction", "state": {"state": "on"}, "ts": datetime.now().isoformat(), "room_id": "kitchen"},
                         {"sensor_id": "motion_sensor", "state": {}, "ts": datetime.now().isoformat(), "room_id": "kitchen"}],
            "current_time": "19:30", "weekday": 1, "mode": "ml",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["user_location_hint"] == "kitchen"
    assert body["location_source"] == "ml"
    assert body["location_confidence"] is not None and body["location_confidence"] >= 0.60
    assert body["model_version"]


def test_infer_rule_mode_uses_heuristic_only():
    res = client.post(
        "/api/infer-events",
        json={
            "readings": [{"sensor_id": "motion_sensor", "state": {}, "ts": datetime.now().isoformat(), "room_id": "living"}],
            "current_time": "19:30", "weekday": 1, "mode": "rule",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["user_location_hint"] == "living"
    assert body["location_source"] == "heuristic"
    assert body["location_confidence"] is None
    assert body["model_version"] is None


@needs_trained_model
def test_health_reports_ml_status():
    body = client.get("/api/health").json()
    assert body["location_model_loaded"] is True
    assert body["location_model_version"]
    assert body["location_cv_accuracy"] >= 0.70
