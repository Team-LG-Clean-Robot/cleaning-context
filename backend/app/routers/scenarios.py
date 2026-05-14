from fastapi import APIRouter

from app.data_loader import load_scenarios

router = APIRouter()


@router.get("/scenarios")
def list_scenarios() -> list[dict]:
    return [
        {
            "id": s.id,
            "name_ko": s.name_ko,
            "description": s.description,
            "current_time": s.current_time,
            "sleep_time": s.sleep_time,
            "user_location": s.user_location,
            "active_events": s.active_events,
        }
        for s in load_scenarios().values()
    ]
