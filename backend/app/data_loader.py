import json
from functools import lru_cache
from pathlib import Path

from app.schemas.event import Event
from app.schemas.room import Room
from app.schemas.scenario import Scenario

DATA_DIR = Path(__file__).parent / "data"


@lru_cache
def load_rooms() -> dict[str, Room]:
    raw = json.loads((DATA_DIR / "rooms.json").read_text(encoding="utf-8"))
    return {r["id"]: Room(**r) for r in raw}


@lru_cache
def load_events() -> dict[str, Event]:
    raw = json.loads((DATA_DIR / "events.json").read_text(encoding="utf-8"))
    return {e["id"]: Event(**e) for e in raw}


@lru_cache
def load_scenarios() -> dict[str, Scenario]:
    raw = json.loads((DATA_DIR / "scenarios.json").read_text(encoding="utf-8"))
    return {s["id"]: Scenario(**s) for s in raw}


@lru_cache
def load_rules() -> dict:
    return json.loads((DATA_DIR / "scoring_rules.json").read_text(encoding="utf-8"))


@lru_cache
def load_ml_confidence() -> dict:
    return json.loads((DATA_DIR / "ml_confidence.json").read_text(encoding="utf-8"))


@lru_cache
def load_inference_engine():
    """v2 — IoT sensor → event 추론 엔진. docs/IOT_DOMAIN.md 참조."""
    from app.services.sensor_inference import SensorInferenceEngine

    return SensorInferenceEngine(DATA_DIR / "sensor_inference_rules.json")
