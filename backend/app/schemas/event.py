from pydantic import BaseModel


class EventEffect(BaseModel):
    room_id: str
    delta: int


class Event(BaseModel):
    id: str
    name_ko: str
    effects: list[EventEffect]
