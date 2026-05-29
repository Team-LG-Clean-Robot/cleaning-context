"""IoT 멀티센서 → 이벤트 추론 + 사용자 위치 추정 endpoint.

- 이벤트 추론: 룰 기반 (sensor_inference.py, 13 규칙)
- 위치 추정 : mode 에 따라 ML(CASAS hh106 학습) 또는 motion 휴리스틱
  - mode=ml|hybrid → LocationEstimator (confidence>=0.60 ML, 미만 휴리스틱)
  - mode=rule      → motion 휴리스틱만

설계: docs/CLEANING_DECISION_ALGORITHM.md §1 (ML=위치 추정 한 가지)
"""
from __future__ import annotations

from fastapi import APIRouter

from app.data_loader import load_inference_engine, load_location_estimator
from app.schemas.sensor import InferRequest, InferResponse

router = APIRouter()


@router.post("/infer-events", response_model=InferResponse)
def infer_events(req: InferRequest) -> InferResponse:
    engine = load_inference_engine()
    rule_events = engine.evaluate(
        readings=req.readings,
        current_time=req.current_time,
        weekday=req.weekday,
        sleep_time=req.sleep_time,
    )
    rule_events.sort(key=lambda e: e.confidence, reverse=True)

    if req.mode in ("ml", "hybrid"):
        est = load_location_estimator().estimate(req.readings, req.current_time)
        return InferResponse(
            inferred_events=rule_events,
            user_location_hint=est.user_room,
            location_confidence=round(est.confidence, 4),
            location_source=est.source,
            model_version=est.model_version,
        )

    # mode=rule — 위치는 motion 휴리스틱만
    return InferResponse(
        inferred_events=rule_events,
        user_location_hint=engine.user_location_hint(req.readings),
        location_confidence=None,
        location_source="heuristic",
        model_version=None,
    )
