from fastapi import APIRouter

from app.data_loader import load_events

router = APIRouter()


@router.get("/events")
def list_events() -> list[dict]:
    return [
        {
            "id": e.id,
            "name_ko": e.name_ko,
            "effects": [
                {"room_id": ef.room_id, "delta": ef.delta} for ef in e.effects
            ],
        }
        for e in load_events().values()
    ]
