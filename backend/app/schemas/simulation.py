import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Mode = Literal["normal", "quiet", "delayed", "excluded"]

TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
ROOM_IDS = {"entrance", "living", "kitchen", "bedroom", "bathroom"}


class ScoreContribution(BaseModel):
    source: str
    label_ko: str
    delta: int


class RoomScore(BaseModel):
    room_id: str
    base: int
    breakdown: list[ScoreContribution]
    final: int
    mode: Mode
    exclusion_reason: str | None = None


class CustomContext(BaseModel):
    current_time: str = Field(..., description="HH:MM 24h")
    sleep_time: str = Field(..., description="HH:MM 24h")
    user_location: str | None = None
    active_events: list[str] = Field(default_factory=list)
    gap_rooms: list[str] = Field(default_factory=list)

    @field_validator("current_time", "sleep_time")
    @classmethod
    def _hhmm(cls, v: str) -> str:
        if not TIME_PATTERN.match(v):
            raise ValueError("must be HH:MM (24h)")
        return v

    @field_validator("user_location")
    @classmethod
    def _loc(cls, v: str | None) -> str | None:
        if v is not None and v not in ROOM_IDS:
            raise ValueError(f"user_location must be one of {sorted(ROOM_IDS)} or null")
        return v

    @field_validator("active_events")
    @classmethod
    def _events_unique_max10(cls, v: list[str]) -> list[str]:
        if len(v) > 10:
            raise ValueError("max 10 events")
        if len(set(v)) != len(v):
            raise ValueError("duplicate event ids")
        return v


class SimulateRequest(BaseModel):
    scenario_id: str | None = None
    custom: CustomContext | None = None


class SimulateResponse(BaseModel):
    scenario_id: str
    context_summary: str
    rooms: list[RoomScore]
    explanation: str
    fallback: bool
    duration_ms: int
