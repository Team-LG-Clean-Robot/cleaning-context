from fastapi import APIRouter

from app.config import get_settings
from app.data_loader import load_events, load_rooms, load_scenarios

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "llm_available": bool(get_settings().timely_api_key),
        "rooms_loaded": len(load_rooms()),
        "events_loaded": len(load_events()),
        "scenarios_loaded": len(load_scenarios()),
    }
