"""ML 기반 Sensor → Event 분류기 (v2 — IoT 센서 합성 데이터 학습).

v1(CASAS)과 달리 센서별 의미 feature를 사용:
  - door_lock: unlocked vs locked, side in vs out
  - induction: on vs off, transition, duration
  - humidity: rh값, delta, 급증 여부
  등 43개 feature → 11개 이벤트 분류.

학습 코드: backend/analysis/ml_train_v2.py
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from app.schemas.sensor import InferredEvent, SensorReading

MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "models" / "event_classifier_v2.joblib"

SENSOR_IDS = [
    "door_lock", "induction", "microwave", "refrigerator",
    "air_conditioner", "tv", "bed_sensor", "motion_sensor",
    "humidity_bath", "weather_api", "calendar", "smart_speaker",
]
ROOMS = ["entrance", "living", "kitchen", "bedroom", "bathroom"]

SENSOR_TO_ROOM: dict[str, str] = {
    "door_lock": "entrance",
    "induction": "kitchen",
    "microwave": "kitchen",
    "refrigerator": "kitchen",
    "tv": "living",
    "bed_sensor": "bedroom",
    "humidity_bath": "bathroom",
}


class MlEventClassifier:
    def __init__(self):
        import joblib
        bundle = joblib.load(MODEL_PATH)
        self._model = bundle["model"]
        self._labels: list[str] = bundle["labels"]
        self._multi_label: bool = bundle.get("multi_label", False)

    @property
    def version(self) -> str:
        return "v2-iot"

    def predict(
        self,
        readings: list[SensorReading],
        current_time: str,
    ) -> list[InferredEvent]:
        if not readings:
            return []

        features = self._extract_features(readings, current_time)
        X = features.reshape(1, -1)

        results: list[InferredEvent] = []

        if self._multi_label:
            probas = self._model.predict_proba(X)[0]  # shape: (n_labels,)
            for idx, event_id in enumerate(self._labels):
                prob = float(probas[idx])
                if prob < 0.3:
                    continue
                results.append(InferredEvent(
                    event_id=event_id,
                    confidence=round(prob, 3),
                    source="ml",
                    triggered_by=[f"ml:{self.version}"],
                    rule_descriptions=[],
                ))
        else:
            proba = self._model.predict_proba(X)[0]
            for idx, prob in enumerate(proba):
                if prob < 0.1:
                    continue
                event_id = self._labels[idx]
                if event_id == "idle":
                    continue
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
        hour, minute = (int(x) for x in current_time.split(":"))

        sensor_present = {sid: 0.0 for sid in SENSOR_IDS}
        room_counts = {r: 0 for r in ROOMS}

        door_unlocked = 0.0
        door_locked = 0.0
        door_side_out = 0.0
        induction_on = 0.0
        induction_off = 0.0
        induction_transition = 0.0
        induction_duration = 0.0
        microwave_on = 0.0
        fridge_opens = 0.0
        fridge_opens_high = 0.0
        tv_on = 0.0
        tv_duration = 0.0
        bed_occupied = 0.0
        humidity_rh = 0.0
        humidity_delta = 0.0
        humidity_high = 0.0
        weather_rain = 0.0
        rain_mm = 0.0
        calendar_guest = 0.0
        ac_on = 0.0

        for r in readings:
            sid = r.sensor_id
            state = r.state

            if sid in sensor_present:
                sensor_present[sid] = 1.0

            room = r.room_id or state.get("room_id") or SENSOR_TO_ROOM.get(sid)
            if room and room in room_counts:
                room_counts[room] += 1

            if sid == "door_lock":
                if state.get("state") == "unlocked":
                    door_unlocked = 1.0
                elif state.get("state") == "locked":
                    door_locked = 1.0
                if state.get("side") == "out":
                    door_side_out = 1.0

            elif sid == "induction":
                if state.get("state") == "on":
                    induction_on = 1.0
                    induction_duration = float(state.get("duration_min", 0))
                elif state.get("state") == "off":
                    induction_off = 1.0
                    if state.get("transition_from") == "on":
                        induction_transition = 1.0

            elif sid == "microwave":
                if state.get("state") == "on":
                    microwave_on = 1.0

            elif sid == "refrigerator":
                fridge_opens = float(state.get("open_count_last_1h", 0))
                if fridge_opens >= 4:
                    fridge_opens_high = 1.0

            elif sid == "tv":
                if state.get("state") == "on":
                    tv_on = 1.0
                    tv_duration = float(state.get("duration_min", 0))

            elif sid == "bed_sensor":
                if state.get("occupied"):
                    bed_occupied = 1.0

            elif sid == "humidity_bath":
                humidity_rh = float(state.get("rh", 0))
                humidity_delta = float(state.get("rh_delta_last_10min", 0))
                if humidity_rh >= 80 and humidity_delta >= 20:
                    humidity_high = 1.0

            elif sid == "weather_api":
                if state.get("condition") == "rain":
                    weather_rain = 1.0
                rain_mm = float(state.get("last_1h_rain_mm", 0))

            elif sid == "calendar":
                if state.get("upcoming_event_tag") == "guest":
                    calendar_guest = 1.0

            elif sid == "air_conditioner":
                if state.get("state") == "on":
                    ac_on = 1.0

        total_readings = len(readings)
        total_rooms = sum(room_counts.values()) or 1

        feats: list[float] = []

        for sid in SENSOR_IDS:
            feats.append(sensor_present[sid])

        for r in ROOMS:
            feats.append(room_counts[r] / total_rooms)

        feats.append(float(hour))
        feats.append(float(minute))
        feats.append(np.sin(2 * np.pi * hour / 24))
        feats.append(np.cos(2 * np.pi * hour / 24))
        feats.append(1.0 if hour >= 20 or hour <= 7 else 0.0)

        feats.append(door_unlocked)
        feats.append(door_locked)
        feats.append(door_side_out)
        feats.append(induction_on)
        feats.append(induction_off)
        feats.append(induction_transition)
        feats.append(min(induction_duration / 60.0, 1.0))
        feats.append(microwave_on)
        feats.append(min(fridge_opens / 10.0, 1.0))
        feats.append(fridge_opens_high)
        feats.append(tv_on)
        feats.append(min(tv_duration / 180.0, 1.0))
        feats.append(bed_occupied)
        feats.append(min(humidity_rh / 100.0, 1.0))
        feats.append(min(humidity_delta / 40.0, 1.0))
        feats.append(humidity_high)
        feats.append(weather_rain)
        feats.append(min(rain_mm / 20.0, 1.0))
        feats.append(calendar_guest)
        feats.append(ac_on)

        feats.append(min(total_readings / 10.0, 1.0))

        return np.array(feats, dtype=np.float32)
