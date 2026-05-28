import time

from fastapi import APIRouter

from app.config import get_settings
from app.data_loader import load_events, load_inference_engine, load_rooms, load_scenarios

router = APIRouter()

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
        "cold_start": uptime_sec < _COLD_START_WINDOW_SEC,
        "uptime_sec": int(uptime_sec),
        "inference_rules_loaded": len(load_inference_engine().rules),
    }
