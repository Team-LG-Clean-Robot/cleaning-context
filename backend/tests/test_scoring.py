"""
Golden tests for scoring engine.

기대값은 SCORING_RULES.md §6 기준. 시나리오 3(pre_sleep)의 침실 점수는
PLANNING.md(-35) vs 룰(-25) 차이가 있으며, 본 테스트는 룰을 ground truth로 본다.
"""

import pytest
from fastapi.testclient import TestClient

from app.data_loader import load_events, load_rooms, load_rules, load_scenarios
from app.main import app
from app.services.context_builder import build_context
from app.services.scoring import compute_scores

EXPECTED_SCORES: dict[str, dict[str, tuple[int, str]]] = {
    "rainy_return": {
        "entrance": (65, "normal"),
        "living": (40, "normal"),
        "kitchen": (20, "normal"),
        "bedroom": (-15, "excluded"),
        "bathroom": (10, "normal"),
    },
    "post_cooking": {
        "kitchen": (50, "normal"),
        "living": (5, "delayed"),
        "entrance": (30, "normal"),
        "bedroom": (15, "normal"),
        "bathroom": (10, "normal"),
    },
    "guest_incoming": {
        # MVP에서 cleanup_gap 차등 메커니즘 제외 (단일 +10 와일드카드는 PLANNING의 +15/+10 차이를 표현 못함)
        # 결과: 거실=현관=50으로 동률, "거실/현관 우선" narrative는 유지
        "living": (50, "normal"),
        "entrance": (50, "normal"),
        "kitchen": (25, "normal"),
        "bedroom": (5, "normal"),
        "bathroom": (20, "normal"),
    },
}

# pre_sleep는 점수가 룰 기반 derived → 모드만 검증
EXPECTED_MODES_PRE_SLEEP = {
    "bedroom": "excluded",
    "entrance": "normal",  # 30 - 5 = 25, noise_sensitivity 2 < quiet threshold 4
    "kitchen": "quiet",   # 20 - 5 = 15, noise 4 ≥ 4
    "living": "quiet",    # 25 - 15 = 10, noise 5 ≥ 4
    "bathroom": "normal", # 10 - 5 = 5, noise 3 < 4
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
    assert len(body) == 4
    ids = {s["id"] for s in body}
    assert ids == {"rainy_return", "post_cooking", "pre_sleep", "guest_incoming"}
