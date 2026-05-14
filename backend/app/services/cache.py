import json
from pathlib import Path

from app.config import get_settings
from app.data_loader import load_rules


def cache_key(scenario_id: str) -> str:
    rule_version = load_rules().get("rule_version", "v1")
    return f"{scenario_id}_{rule_version}"


def _path(key: str) -> Path:
    d = Path(get_settings().cache_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{key}.json"


def get(key: str) -> dict | None:
    p = _path(key)
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def put(key: str, payload: dict) -> None:
    _path(key).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
