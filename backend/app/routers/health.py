import time

from fastapi import APIRouter

from app.config import get_settings
from app.data_loader import load_events, load_inference_engine, load_rooms, load_scenarios

router = APIRouter()

# 프로세스 시작 시각 — cold_start 판정용 (v2, 멘토 피드백 2026-05-16)
_BOOT_TS = time.monotonic()
_COLD_START_WINDOW_SEC = 30


@router.get("/health")
def health() -> dict:
    uptime_sec = time.monotonic() - _BOOT_TS
    return {
        "status": "ok",
        "llm_available": bool(get_settings().timely_api_key),
        "rooms_loaded": len(load_rooms()),
        "events_loaded": len(load_events()),
        "scenarios_loaded": len(load_scenarios()),
        # v2 — Flutter splash가 "서버 깨우는 중..." 메시지 노출용
        "cold_start": uptime_sec < _COLD_START_WINDOW_SEC,
        "uptime_sec": int(uptime_sec),
        # v2 — IoT 멀티센서 도메인
        "inference_rules_loaded": len(load_inference_engine().rules),
        "ml_classifier_loaded": False,  # 학습 완료 후 services/event_classifier에서 True 반환
    }
