from pydantic import BaseModel


class Bbox(BaseModel):
    x: int
    y: int
    w: int
    h: int


class Room(BaseModel):
    id: str
    name_ko: str
    base_score: int
    noise_sensitivity: int
    last_cleaned_hours: float
    bbox: Bbox
