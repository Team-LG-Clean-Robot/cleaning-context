from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["rooms_loaded"] == 5
    assert body["events_loaded"] == 7  # rain, user_returned, cooking_done, guest_arriving_2h, pre_sleep_2h, pre_sleep_30min, guest_visit_recent
    assert body["scenarios_loaded"] == 4
    assert isinstance(body["llm_available"], bool)
