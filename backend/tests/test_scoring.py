"""
Golden tests for scoring engine.

v2 재설계: ML feature importance 기반 base_score 재조정 + 이벤트 delta 차별화.
6개 시나리오가 5개 방 모두를 1위로 활용하도록 설계.
"""

import pytest
from fastapi.testclient import TestClient

from app.data_loader import load_events, load_rooms, load_rules, load_scenarios
from app.main import app
from app.services.context_builder import build_context
from app.services.scoring import compute_scores

EXPECTED_SCORES: dict[str, dict[str, tuple[int, str]]] = {
    "rainy_return": {
        "entrance": (62, "normal"),
        "living": (35, "normal"),
        "kitchen": (28, "normal"),
        "bathroom": (18, "normal"),
        "bedroom": (-8, "excluded"),
    },
    "post_cooking": {
        "kitchen": (63, "normal"),
        "entrance": (22, "normal"),
        "bathroom": (18, "normal"),
        "bedroom": (12, "normal"),
        "living": (5, "delayed"),
    },
    "guest_incoming": {
        "living": (50, "normal"),
        "kitchen": (38, "normal"),
        "entrance": (37, "normal"),
        "bathroom": (33, "normal"),
        "bedroom": (7, "normal"),
    },
    "morning_quick_clean": {
        "bedroom": (37, "normal"),
        "kitchen": (33, "normal"),
        "entrance": (27, "normal"),
        "living": (25, "normal"),
        "bathroom": (23, "normal"),
    },
    "cooking_in_progress": {
        "living": (35, "normal"),
        "entrance": (27, "normal"),
        "bathroom": (23, "normal"),
        "bedroom": (17, "normal"),
        "kitchen": (-32, "excluded"),
    },
}

EXPECTED_MODES_PRE_SLEEP = {
    "bathroom": "normal",   # 18 + 15 = 33, noise 3 < 4
    "kitchen": "quiet",     # 28, noise 4 ≥ 4
    "living": "quiet",      # 20 + 5 = 25, noise 5 ≥ 4
    "entrance": "normal",   # 22, noise 2 < 4
    "bedroom": "excluded",  # 12 - 40 - 20(occ) - 10(noise) = -58
}


@pytest.mark.parametrize("scenario_id", list(EXPECTED_SCORES.keys()))
def test_golden_scores(scenario_id: str):
    ctx = build_context(scenario_id, load_scenarios(), load_events())
    results = {r.room_id: r for r in compute_scores(ctx, load_rooms(), load_rules())}
    for room_id, (expected_score, expected_mode) in EXPECTED_SCORES[scenario_id].items():
        assert results[room_id].final == expected_score, (
            f"{scenario_id}.{room_id}.final: "
            f"expected {expected_score}, got {results[room_id].final} "
            f"breakdown={results[room_id].breakdown}"
        )
        assert results[room_id].mode == expected_mode, (
            f"{scenario_id}.{room_id}.mode: expected {expected_mode}, got {results[room_id].mode}"
        )


def test_pre_sleep_modes():
    ctx = build_context("pre_sleep", load_scenarios(), load_events())
    results = {r.room_id: r for r in compute_scores(ctx, load_rooms(), load_rules())}
    for room_id, expected_mode in EXPECTED_MODES_PRE_SLEEP.items():
        assert results[room_id].mode == expected_mode, (
            f"pre_sleep.{room_id}.mode: expected {expected_mode}, got {results[room_id].mode}, "
            f"final={results[room_id].final}"
        )


def test_consistency():
    """동일 입력 100회 → 결과 100% 동일 (PLANNING KPI)."""
    ctx = build_context("rainy_return", load_scenarios(), load_events())
    first = compute_scores(ctx, load_rooms(), load_rules())
    for _ in range(99):
        assert compute_scores(ctx, load_rooms(), load_rules()) == first


def test_sorted_descending():
    ctx = build_context("guest_incoming", load_scenarios(), load_events())
    results = compute_scores(ctx, load_rooms(), load_rules())
    finals = [r.final for r in results]
    assert finals == sorted(finals, reverse=True)


def test_simulate_endpoint_schema():
    client = TestClient(app)
    res = client.post("/api/simulate", json={"scenario_id": "rainy_return"})
    assert res.status_code == 200
    body = res.json()
    assert {"scenario_id", "rooms", "explanation", "fallback", "duration_ms"} <= body.keys()
    assert len(body["rooms"]) == 5
    assert isinstance(body["fallback"], bool)
    assert isinstance(body["explanation"], str)


def test_simulate_unknown_scenario():
    client = TestClient(app)
    res = client.post("/api/simulate", json={"scenario_id": "does_not_exist"})
    assert res.status_code == 404


def test_scenarios_list():
    client = TestClient(app)
    res = client.get("/api/scenarios")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 6
    ids = {s["id"] for s in body}
    assert ids == {
        "rainy_return",
        "post_cooking",
        "pre_sleep",
        "guest_incoming",
        "morning_quick_clean",
        "cooking_in_progress",
    }
