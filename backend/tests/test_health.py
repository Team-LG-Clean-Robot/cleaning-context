from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["rooms_loaded"] == 5
    # v2: 기존 7개 + IoT 추론 신규 5개 (cooking_active, tv_watching, recent_shower, user_left, meal_prep)
    assert body["events_loaded"] == 14
    assert body["scenarios_loaded"] == 8
    assert isinstance(body["llm_available"], bool)
    # v2 신규 필드
    assert isinstance(body["cold_start"], bool)
    assert body["inference_rules_loaded"] == 13
    assert body["ml_classifier_loaded"] is False
    # v3 — CASAS 데이터셋 검증 결과
    validation = body["dataset_validation"]
    assert validation is not None
    assert validation["accuracy"] > 0.5
    assert validation["mapped_rules"] >= 8
