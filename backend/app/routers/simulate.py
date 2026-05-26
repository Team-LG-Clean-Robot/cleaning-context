import time
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.data_loader import (
    load_events,
    load_inference_engine,
    load_ml_classifier,
    load_ml_confidence,
    load_rooms,
    load_rules,
    load_scenarios,
)
from app.schemas.simulation import (
    CustomContext,
    InferredEventInfo,
    MlEventConfidence,
    MlInfo,
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


def _build_ml_info(active_event_ids: list[str]) -> MlInfo:
    conf = load_ml_confidence()
    event_map = conf["event_map"]
    items = []
    for eid in active_event_ids:
        if eid in event_map:
            m = event_map[eid]
            items.append(MlEventConfidence(event_id=eid, ml_label=m["ml_label"], f1=m["f1"]))
    return MlInfo(
        model_name=conf["model_name"],
        cv_accuracy=conf["cv_accuracy"],
        dataset=conf["dataset"],
        event_confidence=items,
    )


def _run(
    ctx: ScoringContext,
    t0: float,
    summary: str,
    cache_key: str | None,
    inferred_events: list[InferredEventInfo] | None = None,
) -> SimulateResponse:
    """scoring → cache hit 우선 → LLM. 시나리오/custom 공통 hot path."""
    scores = compute_scores(ctx, load_rooms(), load_rules())
    ml_info = _build_ml_info([ev.id for ev in ctx.resolved_events])

    if cache_key is not None:
        cached = cache.get(cache_key)
        if cached:
            return SimulateResponse(
                **{**cached, "duration_ms": int((time.perf_counter() - t0) * 1000), "ml": ml_info},
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
        ml=ml_info,
        inferred_events=inferred_events or [],
    )
    if cache_key is not None and not fallback:
        payload = response.model_dump()
        payload.pop("duration_ms", None)
        payload.pop("ml", None)
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
        return _run(ctx, t0, summary, cache.cache_key(req.scenario_id))

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
    """sensor_readings → ML 추론 → CustomContext + 추론 결과."""
    engine = load_inference_engine()
    override = req.custom

    now = datetime.now()
    current_time = override.current_time if override else f"{now.hour:02d}:{now.minute:02d}"
    sleep_time = override.sleep_time if override else "23:00"

    classifier = load_ml_classifier()
    ml_events = classifier.predict(req.sensor_readings, current_time)

    inferred_info = [
        InferredEventInfo(event_id=e.event_id, confidence=e.confidence, source=e.source)
        for e in ml_events
    ]
    sensor_event_ids = list(dict.fromkeys(e.event_id for e in ml_events))

    # custom.active_events가 있으면 합집합
    explicit_events = list(override.active_events) if override else []
    merged_events = list(dict.fromkeys(explicit_events + sensor_event_ids))

    # user_location: override 우선, 없으면 motion_sensor 힌트
    user_location = override.user_location if override and override.user_location else None
    if user_location is None:
        user_location = engine.user_location_hint(req.sensor_readings)

    gap_rooms = list(override.gap_rooms) if override else []
    custom = CustomContext(
        current_time=current_time,
        sleep_time=sleep_time,
        user_location=user_location,
        active_events=merged_events,
        gap_rooms=gap_rooms,
    )
    return custom, inferred_info
