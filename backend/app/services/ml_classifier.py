"""ML 기반 Sensor → Event 분류기.

학습된 RandomForest 모델(backend/models/event_classifier.joblib)을 로드하고,
SensorReading[] → feature 추출 → predict → InferredEvent[] 반환.

학습 코드: backend/analysis/ml_train.py (CASAS hh106)
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from app.schemas.sensor import InferredEvent, SensorReading

MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "models" / "event_classifier.joblib"

# ML 라벨 → 시스템 events.json 이벤트 매핑 (1:N 가능)
ML_TO_SYSTEM_EVENT: dict[str, list[str]] = {
    "cooking_active": ["cooking_active"],
    "cooking_done": ["cooking_done"],
    "entertain_guests": ["guest_arriving_2h", "guest_visit_recent"],
    "pre_sleep": ["pre_sleep_30min", "pre_sleep_2h"],
    "recent_shower": ["recent_shower"],
    "tv_watching": ["tv_watching"],
    "user_left": ["user_left"],
    "user_returned": ["user_returned"],
}

SENSOR_TO_ROOM: dict[str, str] = {
    "door_lock": "entrance",
    "induction": "kitchen",
    "microwave": "kitchen",
    "refrigerator": "kitchen",
    "tv": "living",
    "bed_sensor": "bedroom",
    "humidity_bath": "bathroom",
}

ROOMS = ["kitchen", "living", "bedroom", "bathroom", "entrance", "dining"]


class MlEventClassifier:
    def __init__(self):
        import joblib
        bundle = joblib.load(MODEL_PATH)
        self._model = bundle["model"]
        self._labels: list[str] = bundle["labels"]

    @property
    def version(self) -> str:
        return "v1-forest"

    def predict(
        self,
        readings: list[SensorReading],
        current_time: str,
    ) -> list[InferredEvent]:
        if not readings:
            return []

        features = self._extract_features(readings, current_time)
        proba = self._model.predict_proba(features.reshape(1, -1))[0]

        results: list[InferredEvent] = []
        for idx, prob in enumerate(proba):
            if prob < 0.15:
                continue
            ml_label = self._labels[idx]
            system_events = ML_TO_SYSTEM_EVENT.get(ml_label, [ml_label])
            for event_id in system_events:
                results.append(InferredEvent(
                    event_id=event_id,
                    confidence=round(float(prob), 3),
                    source="ml",
                    triggered_by=[f"ml:{self.version}"],
                    rule_descriptions=[],
                ))

        return sorted(results, key=lambda e: e.confidence, reverse=True)

    def _extract_features(
        self,
        readings: list[SensorReading],
        current_time: str,
    ) -> np.ndarray:
        room_counts: dict[str, int] = {r: 0 for r in ROOMS}

        has_door = False
        has_open = False

        for r in readings:
            room = r.room_id or r.state.get("room_id") or SENSOR_TO_ROOM.get(r.sensor_id)
            if room and room in room_counts:
                room_counts[room] += 1

            if r.sensor_id == "door_lock":
                has_door = True
                if r.state.get("state") == "unlocked":
                    has_open = True

            if r.sensor_id == "refrigerator":
                has_open = True

        total = sum(room_counts.values())
        if total == 0:
            total = 1

        hour, minute = (int(x) for x in current_time.split(":"))

        ts_list = [r.ts for r in readings]
        if len(ts_list) >= 2:
            duration_sec = (max(ts_list) - min(ts_list)).total_seconds()
        else:
            duration_sec = 0.0

        feats: list[float] = []
        for r in ROOMS:
            feats.append(room_counts[r] / total)
            feats.append(float(room_counts[r]))
        feats.append(float(hour))
        feats.append(float(minute))
        feats.append(np.sin(2 * np.pi * hour / 24))
        feats.append(np.cos(2 * np.pi * hour / 24))
        feats.append(float(total))
        feats.append(duration_sec)
        feats.append(1.0 if has_door else 0.0)
        feats.append(1.0 if has_open else 0.0)
        feats.append(1.0 if hour >= 20 or hour <= 7 else 0.0)

        return np.array(feats, dtype=np.float32)
