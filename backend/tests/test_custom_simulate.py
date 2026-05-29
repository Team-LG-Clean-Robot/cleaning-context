from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_custom_matches_rainy_return():
    """직접 입력으로 rainy_return 시나리오를 재현 → 점수·모드 일치."""
    res = client.post(
        "/api/simulate",
        json={
            "custom": {
                "current_time": "20:30",
                "sleep_time": "23:00",
                "user_location": None,
                "active_events": ["rain", "user_returned", "pre_sleep_2h"],
                "gap_rooms": [],
            }
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["scenario_id"] == "__custom__"
    by_room = {r["room_id"]: r for r in body["rooms"]}
    assert by_room["entrance"]["final"] == 62
    assert by_room["entrance"]["mode"] == "normal"
    assert by_room["living"]["final"] == 35
    assert by_room["kitchen"]["final"] == 28
    assert by_room["bedroom"]["final"] == -8
    assert by_room["bedroom"]["mode"] == "excluded"


def test_custom_empty_events_returns_base():
    res = client.post(
        "/api/simulate",
        json={
            "custom": {
                "current_time": "12:00",
                "sleep_time": "23:00",
                "user_location": None,
                "active_events": [],
                "gap_rooms": [],
            }
        },
    )
    assert res.status_code == 200
    body = res.json()
    by_room = {r["room_id"]: r for r in body["rooms"]}
    assert by_room["entrance"]["final"] == 22
    assert by_room["bedroom"]["final"] == 12
    assert all(r["mode"] == "normal" for r in body["rooms"])


def test_simulate_400_when_both_none():
    assert client.post("/api/simulate", json={}).status_code == 400


def test_simulate_400_when_both_provided():
    res = client.post(
        "/api/simulate",
        json={
            "scenario_id": "rainy_return",
            "custom": {
                "current_time": "12:00",
                "sleep_time": "23:00",
                "user_location": None,
                "active_events": [],
                "gap_rooms": [],
            },
        },
    )
    assert res.status_code == 400


def test_simulate_400_unknown_event():
    res = client.post(
        "/api/simulate",
        json={
            "custom": {
                "current_time": "12:00",
                "sleep_time": "23:00",
                "user_location": None,
                "active_events": ["does_not_exist"],
                "gap_rooms": [],
            }
        },
    )
    assert res.status_code == 400
    assert "unknown event" in res.json()["detail"]


def test_simulate_422_invalid_time():
    res = client.post(
        "/api/simulate",
        json={
            "custom": {
                "current_time": "25:99",
                "sleep_time": "23:00",
                "user_location": None,
                "active_events": [],
                "gap_rooms": [],
            }
        },
    )
    assert res.status_code == 422


def test_simulate_422_invalid_user_location():
    res = client.post(
        "/api/simulate",
        json={
            "custom": {
                "current_time": "12:00",
                "sleep_time": "23:00",
                "user_location": "garage",
                "active_events": [],
                "gap_rooms": [],
            }
        },
    )
    assert res.status_code == 422


def test_get_events_returns_all_known_ids():
    res = client.get("/api/events")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 14
    ids = {e["id"] for e in body}
    assert ids == {
        "rain",
        "user_returned",
        "cooking_done",
        "guest_arriving_2h",
        "pre_sleep_2h",
        "pre_sleep_30min",
        "guest_visit_recent",
        "cooking_active",
        "tv_watching",
        "recent_shower",
        "user_left",
        "meal_prep",
        "package_delivery",
        "meal_finished",
    }
    rain = next(e for e in body if e["id"] == "rain")
    assert rain["name_ko"] == "비"
    assert len(rain["effects"]) == 2


def test_get_scenarios_includes_sleep_time_and_events():
    res = client.get("/api/scenarios")
    assert res.status_code == 200
    body = res.json()
    rainy = next(s for s in body if s["id"] == "rainy_return")
    assert rainy["sleep_time"] == "23:00"
    assert "rain" in rainy["active_events"]
