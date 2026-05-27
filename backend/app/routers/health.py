import json
import time
from pathlib import Path

from fastapi import APIRouter

from app.config import get_settings
from app.data_loader import load_events, load_inference_engine, load_ml_classifier, load_rooms, load_scenarios

router = APIRouter()

_BOOT_TS = time.monotonic()
_COLD_START_WINDOW_SEC = 30

_METRICS_PATH = Path(__file__).resolve().parent.parent.parent / "reports" / "casas_metrics.json"


def _load_validation_summary() -> dict | None:
    if not _METRICS_PATH.exists():
        return None
    data = json.loads(_METRICS_PATH.read_text(encoding="utf-8"))
    return {
        "dataset": data["dataset"],
        "accuracy": data["overall_accuracy"],
        "segments": data["activity_segments"],
        "mapped_rules": len(data["mapped_rules"]),
        "top_f1": {
            k: v["f1"]
            for k, v in sorted(
                data["per_class_metrics"].items(),
                key=lambda x: -x[1]["f1"],
            )[:3]
        },
    }


def _ml_loaded() -> bool:
    try:
        load_ml_classifier()
        return True
    except Exception:
        return False


@router.get("/health")
def health() -> dict:
    uptime_sec = time.monotonic() - _BOOT_TS
    return {
        "status": "ok",
        "llm_available": bool(get_settings().timely_api_key),
        "rooms_loaded": len(load_rooms()),
        "events_loaded": len(load_events()),
        "scenarios_loaded": len(load_scenarios()),
        "cold_start": uptime_sec < _COLD_START_WINDOW_SEC,
        "uptime_sec": int(uptime_sec),
        "inference_rules_loaded": len(load_inference_engine().rules),
        "ml_classifier_loaded": _ml_loaded(),
        "dataset_validation": _load_validation_summary(),
    }
