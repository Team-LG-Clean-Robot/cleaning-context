from pydantic import BaseModel


class Scenario(BaseModel):
    id: str
    name_ko: str
    description: str
    current_time: str
    sleep_time: str
    user_location: str | None = None
    active_events: list[str]
    gap_rooms: list[str] = []
