"""IoT 멀티센서 → 이벤트 추론 endpoint (rule-based).

ML 분류기는 박주상 v3 설계로 재설계 예정 (archive/ml-v2/ 보관).
"""
from __future__ import annotations

from fastapi import APIRouter

from app.data_loader import load_inference_engine
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
    return InferResponse(
        inferred_events=sorted(rule_events, key=lambda e: e.confidence, reverse=True),
        user_location_hint=engine.user_location_hint(req.readings),
        model_version=None,
    )
