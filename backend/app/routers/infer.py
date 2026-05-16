"""IoT 멀티센서 → 이벤트 추론 endpoint (v2, 멘토 피드백 2026-05-16).

docs/IOT_DOMAIN.md §3 — Rule-based 13개 규칙 평가. ML 분류기는 별도 트랙 (학습 후 통합).
"""
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

    # ML 분류기는 아직 미통합 — req.mode가 'ml'/'hybrid'여도 rule 결과만 반환
    # 학습 완료(backend/models/event_classifier.joblib) 후 services/event_classifier 추가하면서 머지
    model_version = None

    return InferResponse(
        inferred_events=rule_events,
        user_location_hint=engine.user_location_hint(req.readings),
        model_version=model_version,
    )
