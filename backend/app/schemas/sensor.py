"""IoT 멀티센서 도메인 Pydantic 모델 (v2 멘토 피드백 2026-05-16 반영).

상세 도메인 설계는 docs/IOT_DOMAIN.md 참조.
센서 카탈로그: backend/app/data/sensors.json
추론 규칙: backend/app/data/sensor_inference_rules.json
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

InferMode = Literal["rule", "ml", "hybrid"]
InferSource = Literal["rule", "ml"]
TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class SensorReading(BaseModel):
    """단일 IoT 센서의 시점 시그널."""

    sensor_id: str = Field(..., description="sensors.json의 id (door_lock, induction, …)")
    state: dict[str, Any] = Field(..., description="센서별 상태. 예: {state: unlocked, side: out}")
    ts: datetime = Field(..., description="시그널 발생 시각 (서버 시간 기준 ISO8601)")
    room_id: str | None = Field(None, description="air_conditioner처럼 방별 인스턴스용")


class InferRequest(BaseModel):
    readings: list[SensorReading] = Field(default_factory=list, max_length=50)
    current_time: str = Field(..., description="HH:MM 24h")
    weekday: int = Field(..., ge=0, le=6, description="0=월, 6=일")
    sleep_time: str = Field("23:00", description="HH:MM 24h, 취침 예정 시각")
    mode: InferMode = "ml"

    @field_validator("current_time", "sleep_time")
    @classmethod
    def _hhmm(cls, v: str) -> str:
        if not TIME_PATTERN.match(v):
            raise ValueError("must be HH:MM (24h)")
        return v


class InferredEvent(BaseModel):
    """추론된 한 개 이벤트. event_id는 events.json vocab과 일치."""

    event_id: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    source: InferSource
    triggered_by: list[str] = Field(
        default_factory=list,
        description='추론 출처. Rule이면 ["R-RETURN-1"], ML이면 ["ml:v1-forest"]',
    )
    rule_descriptions: list[str] = Field(
        default_factory=list, description="사용자 설명용 한국어 (rule이 발생시킨 경우)"
    )


class InferResponse(BaseModel):
    inferred_events: list[InferredEvent] = Field(
        default_factory=list, description="confidence desc 정렬"
    )
    user_location_hint: str | None = Field(
        None, description="motion_sensor 기반 사용자 위치 추정 (room_id)"
    )
    model_version: str | None = Field(None, description="ML 사용 시 모델 버전")
