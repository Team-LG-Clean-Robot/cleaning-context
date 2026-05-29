"""CASAS hh106 → 위치 추정 학습 데이터 (offline, 학습 시에만 사용).

CASAS hh106 (WSU, Zenodo CC BY 4.0) 은 단일 거주자 스마트홈의 방별 모션
이벤트 로그다. 각 ON 이벤트의 location 컬럼이 곧 사용자의 현재 위치(ground
truth)이므로, 위치 추정 학습에 직접 쓸 수 있다.

라인 형식:  date,time,location,ON|OFF[,Activity="begin"|"end"]
예:        2011-06-15,02:13:20.812509,Bedroom,ON,Sleep="begin"

샘플링: 각 ON 이벤트 시각 t 에서
  - features = 직전 윈도우(t-W ~ t, 현재 포함)의 방별 시간감쇠 활동 (features.featurize)
  - label    = t 의 방
단일 거주자라 정확도는 본질적으로 높다. ML 의 실효 가치는 방 전환 구간에서의
calibrated confidence (predict_proba) — §1.3 의 0.60 임계 판단에 쓰인다.

데이터 경로: backend/data/casas/labeled/hh106.csv (gitignored — 로컬/Windows 보관)
"""
from __future__ import annotations

from collections import deque
from datetime import datetime
from pathlib import Path

from app.ml.features import CASAS_LOCATION_TO_ROOM, WINDOW_MIN, RoomEvent, featurize

# 윈도우 룩백 이벤트 상한 (속도). WINDOW_MIN 안에서 충분.
_MAX_LOOKBACK = 60


def _parse_line(line: str) -> tuple[datetime, str] | None:
    """ON 이벤트만 (ts, our_room) 으로. 그 외 None."""
    parts = line.strip().split(",")
    if len(parts) < 4:
        return None
    date_str, time_str, location, value = parts[0], parts[1], parts[2], parts[3]
    if value != "ON":
        return None
    room = CASAS_LOCATION_TO_ROOM.get(location)
    if room is None:
        return None
    try:
        ts = datetime.strptime(f"{date_str} {time_str.split('.')[0]}", "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None
    return ts, room


def load_casas_samples(
    csv_path: Path,
) -> tuple[list[list[float]], list[str]]:
    """hh106.csv → (X, y). X: feature 벡터 리스트, y: 방 라벨 리스트."""
    events: list[tuple[float, str, int]] = []  # (minute, room, hour)
    with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            parsed = _parse_line(line)
            if parsed is None:
                continue
            ts, room = parsed
            events.append((ts.timestamp() / 60.0, room, ts.hour))

    X: list[list[float]] = []
    y: list[str] = []
    window: deque[RoomEvent] = deque(maxlen=_MAX_LOOKBACK)
    for minute, room, hour in events:
        # 윈도우에서 오래된 이벤트 제거 (현재 포함 전 상태)
        while window and minute - window[0].minute > WINDOW_MIN:
            window.popleft()
        window.append(RoomEvent(room=room, minute=minute))
        X.append(featurize(list(window), now_minute=minute, hour=hour))
        y.append(room)
    return X, y
