"""IoT 멀티센서 → 이벤트 추론 endpoint (v2, ML 통합).

mode:
  - "rule"   → Rule-based 13개 규칙만
  - "ml"     → RandomForest 분류기만
  - "hybrid" → 둘 다 돌리고 event별 confidence 높은 쪽 채택 (default)
"""
from __future__ import annotations

from fastapi import APIRouter

from app.data_loader import load_inference_engine, load_ml_classifier
from app.schemas.sensor import InferredEvent, InferRequest, InferResponse

router = APIRouter()


def _merge_hybrid(
    rule_events: list[InferredEvent],
    ml_events: list[InferredEvent],
) -> list[InferredEvent]:
    """event_id별로 confidence 높은 쪽을 채택하고, 한쪽에만 있는 것도 포함."""
    by_id: dict[str, InferredEvent] = {}

    for e in rule_events:
        by_id[e.event_id] = e

    for e in ml_events:
        existing = by_id.get(e.event_id)
        if existing is None:
            by_id[e.event_id] = e
        elif e.confidence > existing.confidence:
            by_id[e.event_id] = InferredEvent(
                event_id=e.event_id,
                confidence=e.confidence,
                source="ml",
                triggered_by=existing.triggered_by + e.triggered_by,
                rule_descriptions=existing.rule_descriptions,
            )
        else:
            by_id[e.event_id] = InferredEvent(
                event_id=existing.event_id,
                confidence=existing.confidence,
                source="rule",
                triggered_by=existing.triggered_by + e.triggered_by,
                rule_descriptions=existing.rule_descriptions,
            )

    return sorted(by_id.values(), key=lambda e: e.confidence, reverse=True)


@router.post("/infer-events", response_model=InferResponse)
def infer_events(req: InferRequest) -> InferResponse:
    engine = load_inference_engine()
    model_version: str | None = None

    if req.mode in ("rule", "hybrid"):
        rule_events = engine.evaluate(
            readings=req.readings,
            current_time=req.current_time,
            weekday=req.weekday,
            sleep_time=req.sleep_time,
        )
    else:
        rule_events = []

    if req.mode in ("ml", "hybrid"):
        classifier = load_ml_classifier()
        ml_events = classifier.predict(req.readings, req.current_time)
        model_version = classifier.version
    else:
        ml_events = []

    if req.mode == "hybrid":
        merged = _merge_hybrid(rule_events, ml_events)
    elif req.mode == "ml":
        merged = ml_events
    else:
        merged = rule_events

    return InferResponse(
        inferred_events=merged,
        user_location_hint=engine.user_location_hint(req.readings),
        model_version=model_version,
    )
