"""위치 추정 feature 추출 — CASAS 학습과 런타임 추론이 공유.

핵심 아이디어: 위치성 센서 활동을 **방별 시간감쇠 활동량**으로 환원한다.
- 학습(CASAS): 모션 이벤트의 방 = location 컬럼 → 방별 활동량
- 런타임(우리 센서): SensorReading 의 sensor_id → 방 매핑 → 방별 활동량

두 경로가 같은 feature 공간(FEATURE_NAMES)으로 떨어지므로,
CASAS 실데이터로 학습한 모델을 우리 12종 센서 입력에 그대로 적용할 수 있다.

설계: docs/CLEANING_DECISION_ALGORITHM.md §1.2 (ML 입력 센서 집합)
"""
from __future__ import annotations

import math
from dataclasses import dataclass

# 추정 대상 공간 (label space). away 는 ML 아닌 rule fallback 에서 결정 (§1.3).
ROOMS: list[str] = ["entrance", "living", "kitchen", "bedroom", "bathroom"]

# 우리 12종 센서 → 주 위치 방 (docs/CLEANING_DECISION_ALGORITHM.md §1.2 / 부록 A).
# room_id 가 reading 에 실려오면 그것을 우선한다 (motion/air_conditioner 등 방별 인스턴스).
SENSOR_ROOM: dict[str, str] = {
    "door_lock": "entrance",
    "induction": "kitchen",
    "microwave": "kitchen",
    "refrigerator": "kitchen",
    "tv": "living",
    "bed_sensor": "bedroom",
    "humidity_bath": "bathroom",
    # motion_sensor / smart_speaker / air_conditioner 는 room_id 로 결정
}
# 위치 단서가 아닌 외부 센서 (ML 입력에서 제외 — §1.2).
NON_LOCATION_SENSORS: set[str] = {"weather_api", "calendar"}

# CASAS hh106 location 컬럼 → 우리 방 (archive/ml-v2 casas_validation.py 매핑 재사용).
# DiningRoom 은 식사/조리 동선이라 kitchen 으로 합친다 (우리 스키마엔 식당 없음).
CASAS_LOCATION_TO_ROOM: dict[str, str] = {
    "Kitchen": "kitchen",
    "DiningRoom": "kitchen",
    "LivingRoom": "living",
    "WorkArea": "living",
    "LoungeChair": "living",
    "Bedroom": "bedroom",
    "Bathroom": "bathroom",
    "OutsideDoor": "entrance",
}

# 시간 감쇠 상수 (분). 최근 활동일수록 가중. 윈도우는 TAU 의 수 배.
TAU_MIN: float = 5.0
WINDOW_MIN: float = 30.0

# feature 순서 (벡터화 시 고정). 방별 [활동합, 최근성] + 시간(2).
FEATURE_NAMES: list[str] = (
    [f"act_{r}" for r in ROOMS]
    + [f"recency_{r}" for r in ROOMS]
    + ["hour_sin", "hour_cos"]
)


@dataclass
class RoomEvent:
    """위치성 활동 1건 — 방 + 발생 시각(분, 임의 기준)."""

    room: str
    minute: float  # 단조 증가 기준 시각 (분). 절대 기준 무관, 상대차만 사용.


def featurize(events: list[RoomEvent], now_minute: float, hour: int) -> list[float]:
    """방별 시간감쇠 활동 벡터 + 시각 feature 를 FEATURE_NAMES 순서로 반환.

    act_<room>     : Σ exp(-Δt/TAU)  (윈도우 내, Δt = now - event)
    recency_<room> : 가장 최근 활동의 가중치 max(0~1). 활동 없으면 0.
    hour_sin/cos   : 하루 24h 주기 인코딩.
    """
    act = {r: 0.0 for r in ROOMS}
    recency = {r: 0.0 for r in ROOMS}
    for e in events:
        if e.room not in act:
            continue
        dt = now_minute - e.minute
        if dt < 0 or dt > WINDOW_MIN:
            continue
        w = math.exp(-dt / TAU_MIN)
        act[e.room] += w
        if w > recency[e.room]:
            recency[e.room] = w
    angle = 2 * math.pi * (hour % 24) / 24.0
    return (
        [act[r] for r in ROOMS]
        + [recency[r] for r in ROOMS]
        + [math.sin(angle), math.cos(angle)]
    )


def reading_room(sensor_id: str, room_id: str | None, state: dict) -> str | None:
    """SensorReading → 위치 방. 위치 단서 없으면 None.

    door_lock 은 상태로 의미가 갈린다: 바깥에서 잠금(locked+out)은 '외출'이라
    현관 점유 신호가 아니다 → None (away 는 estimator fallback 에서 결정, §2.6).
    """
    if sensor_id in NON_LOCATION_SENSORS:
        return None
    st = state if isinstance(state, dict) else {}
    if sensor_id == "door_lock":
        if st.get("state") == "locked" and st.get("side") == "out":
            return None
        return room_id or "entrance"
    if room_id:
        return room_id
    sr = st.get("room_id")
    if isinstance(sr, str):
        return sr
    return SENSOR_ROOM.get(sensor_id)


def latest_motion_room(readings) -> str | None:
    """가장 최근 motion_sensor 가 트리거된 방 (휴리스틱 fallback, §1.3)."""
    motions = [r for r in readings if r.sensor_id == "motion_sensor"]
    if not motions:
        return None
    latest = max(motions, key=lambda r: r.ts)
    room = latest.room_id or (latest.state.get("room_id") if isinstance(latest.state, dict) else None)
    return room if isinstance(room, str) and room in ROOMS else None


def features_from_readings(readings, current_time: str) -> list[float]:
    """런타임 경로: SensorReading[] → feature 벡터.

    ts(wall-clock)/current_time(가상 시각) 불일치를 피하려고, 제공된 readings
    내부의 상대 시각만 쓴다. 가장 늦은 ts 를 now 로 보고 분 단위 차를 계산.
    """
    items: list[tuple[float, str]] = []  # (epoch_minute, room)
    for r in readings:
        room = reading_room(r.sensor_id, r.room_id, r.state)
        if room is None or room not in ROOMS:
            continue
        items.append((r.ts.timestamp() / 60.0, room))
    hour = int(current_time.split(":")[0])
    if not items:
        return featurize([], 0.0, hour)
    now_minute = max(m for m, _ in items)
    events = [RoomEvent(room=room, minute=m) for m, room in items]
    return featurize(events, now_minute, hour)
