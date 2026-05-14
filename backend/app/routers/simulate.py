import time

from fastapi import APIRouter, HTTPException

from app.data_loader import load_events, load_rooms, load_rules, load_scenarios
from app.schemas.simulation import SimulateRequest, SimulateResponse
from app.services import cache, llm_explainer
from app.services.context_builder import (
    ScoringContext,
    build_context,
    build_custom_context,
)
from app.services.scoring import compute_scores

router = APIRouter()


def _run(
    ctx: ScoringContext,
    t0: float,
    summary: str,
    cache_key: str | None,
) -> SimulateResponse:
    """scoring → cache hit 우선 → LLM. 시나리오/custom 공통 hot path."""
    scores = compute_scores(ctx, load_rooms(), load_rules())
    if cache_key is not None:
        cached = cache.get(cache_key)
        if cached:
            return SimulateResponse(
                **{**cached, "duration_ms": int((time.perf_counter() - t0) * 1000)}
            )
    explanation, fallback = llm_explainer.generate_explanation(summary, scores)
    response = SimulateResponse(
        scenario_id=ctx.scenario.id,
        context_summary=summary,
        rooms=scores,
        explanation=explanation,
        fallback=fallback,
        duration_ms=int((time.perf_counter() - t0) * 1000),
    )
    if cache_key is not None and not fallback:
        payload = response.model_dump()
        payload.pop("duration_ms", None)
        cache.put(cache_key, payload)
    return response


@router.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest) -> SimulateResponse:
    if req.scenario_id is None and req.custom is None:
        raise HTTPException(400, "either scenario_id or custom is required")
    if req.scenario_id is not None and req.custom is not None:
        raise HTTPException(400, "cannot provide both scenario_id and custom")

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
        return _run(ctx, t0, summary, cache.cache_key(req.scenario_id))

    custom = req.custom
    unknown = [eid for eid in custom.active_events if eid not in events]
    if unknown:
        raise HTTPException(400, f"unknown event id(s): {unknown}")
    ctx = build_custom_context(custom, events)
    summary = (
        f"직접 입력 · 시각 {custom.current_time}"
        f" · 취침예정 {custom.sleep_time}"
    )
    return _run(ctx, t0, summary, cache_key=None)
