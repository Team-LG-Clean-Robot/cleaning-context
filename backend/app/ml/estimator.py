"""런타임 사용자 위치 추정 — ML + confidence fallback (설계 §1.3).

ML 모델(location_model.joblib)이 있으면 SensorReading → user_room 을 추정하고,
신뢰도가 낮거나 모델이 없으면 모션 휴리스틱/away 로 안전하게 떨어진다.

  location_confidence >= 0.60  → ML 결과 사용 (source="ml")
  < 0.60                       → 최근 motion_sensor 방 (source="heuristic")
  최근 모션도 없음             → door_lock 외출잠금 시 away, 아니면 None

점수 계산(scoring.py)에는 관여하지 않는다. user_room 만 산출한다.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.ml.features import ROOMS, features_from_readings, latest_motion_room

CONFIDENCE_THRESHOLD = 0.60  # 설계 §1.3
MODEL_PATH = Path(__file__).parent / "location_model.joblib"


@dataclass
class LocationEstimate:
    user_room: str | None
    confidence: float
    source: str  # "ml" | "heuristic" | "away" | "none"
    model_version: str | None = None


class LocationEstimator:
    """joblib 모델 lazy-load + fallback. 모델 부재/손상 시에도 동작."""

    def __init__(self, model_path: Path = MODEL_PATH):
        self._model_path = model_path
        self._bundle: dict | None = None
        self._loaded = False

    def _ensure_loaded(self) -> None:
        if self._loaded:
            return
        self._loaded = True
        if not self._model_path.exists():
            return
        try:
            import joblib

            self._bundle = joblib.load(self._model_path)
        except Exception:
            self._bundle = None  # 버전 불일치 등 — 휴리스틱으로 동작

    @property
    def model_loaded(self) -> bool:
        self._ensure_loaded()
        return self._bundle is not None

    @property
    def model_version(self) -> str | None:
        self._ensure_loaded()
        return self._bundle.get("version") if self._bundle else None

    @property
    def metrics(self) -> dict:
        self._ensure_loaded()
        return self._bundle.get("metrics", {}) if self._bundle else {}

    def _ml_predict(self, readings, current_time: str) -> tuple[str, float] | None:
        self._ensure_loaded()
        if not self._bundle:
            return None
        feats = features_from_readings(readings, current_time)
        if not any(feats[: len(ROOMS)]):  # 위치 활동 신호 자체가 없음
            return None
        model = self._bundle["model"]
        classes = list(self._bundle["classes"])
        proba = model.predict_proba([feats])[0]
        best = max(range(len(proba)), key=lambda i: proba[i])
        return classes[best], float(proba[best])

    @staticmethod
    def _is_away(readings) -> bool:
        for r in readings:
            if r.sensor_id == "door_lock":
                st = r.state if isinstance(r.state, dict) else {}
                if st.get("state") == "locked" and st.get("side") == "out":
                    return True
        return False

    def estimate(self, readings, current_time: str) -> LocationEstimate:
        ml = self._ml_predict(readings, current_time)
        if ml is not None and ml[1] >= CONFIDENCE_THRESHOLD:
            return LocationEstimate(
                user_room=ml[0], confidence=ml[1], source="ml",
                model_version=self.model_version,
            )

        # fallback (§1.3)
        motion = latest_motion_room(readings)
        if motion is not None:
            return LocationEstimate(
                user_room=motion,
                confidence=ml[1] if ml else 0.0,
                source="heuristic",
                model_version=self.model_version,
            )
        if self._is_away(readings):
            return LocationEstimate(user_room="away", confidence=0.5, source="away")
        return LocationEstimate(user_room=None, confidence=0.0, source="none")
