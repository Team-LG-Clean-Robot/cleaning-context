"""Sensor → Event 추론 엔진 (Rule MVP).

13개 추론 규칙(`backend/app/data/sensor_inference_rules.json`)을 평가해
SensorReading 리스트 → InferredEvent 리스트로 변환한다.

설계 문서: docs/IOT_DOMAIN.md §3
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Iterable

from app.schemas.sensor import InferredEvent, SensorReading

_CONFIDENCE_MAP = {
    "high": 0.9,
    "medium": 0.6,
    "low": 0.3,
    "deterministic": 1.0,
}


class SensorInferenceEngine:
    def __init__(self, rules_path: Path):
        self._rules: list[dict[str, Any]] = json.loads(rules_path.read_text(encoding="utf-8"))

    @property
    def rules(self) -> list[dict[str, Any]]:
        return self._rules

    def evaluate(
        self,
        readings: list[SensorReading],
        current_time: str,
        weekday: int,
        sleep_time: str,
    ) -> list[InferredEvent]:
        """모든 규칙을 평가하고, 같은 event_id는 confidence max로 dedup."""
        ctx = _Context(current_time=current_time, weekday=weekday, sleep_time=sleep_time)
        results: list[InferredEvent] = []
        for rule in self._rules:
            if self._matches(rule.get("trigger", {}), readings, ctx):
                results.append(
                    InferredEvent(
                        event_id=rule["emit_event"],
                        confidence=_CONFIDENCE_MAP.get(rule.get("confidence", "medium"), 0.5),
                        source="rule",
                        triggered_by=[rule["id"]],
                        rule_descriptions=[rule.get("description", "")],
                    )
                )
        return _dedup(results)

    def user_location_hint(self, readings: list[SensorReading]) -> str | None:
        """R-USER-LOC-1 — 가장 최근 motion_sensor가 트리거된 방."""
        motions = [r for r in readings if r.sensor_id == "motion_sensor"]
        if not motions:
            return None
        latest = max(motions, key=lambda r: r.ts)
        room = latest.room_id or latest.state.get("room_id")
        return room if isinstance(room, str) else None

    # ────────────────────────── trigger matchers ──────────────────────────

    def _matches(self, trigger: dict[str, Any], readings: list[SensorReading], ctx: "_Context") -> bool:
        if "any_of" in trigger:
            return any(self._matches(sub, readings, ctx) for sub in trigger["any_of"])

        sensor_id = trigger.get("sensor")
        if not sensor_id:
            return False

        candidates = [r for r in readings if r.sensor_id == sensor_id]
        if not candidates:
            return False

        # context 조건 (시간 의존 — time_to_sleep_min_lte 등)
        ctx_cond = trigger.get("context", {})
        if not _check_context(ctx_cond, ctx):
            return False

        # state match 조건
        match_spec = trigger.get("match", {})

        for r in candidates:
            if not _match_state(match_spec, r):
                continue
            # within_min 윈도우
            if "within_min" in trigger and not _within_window(r.ts, ctx.now, trigger["within_min"]):
                continue
            # duration_min_gte — state on 지속 시간
            if "duration_min_gte" in trigger:
                # MVP: state.duration_min 필드를 reading.state에 사용자가 mock으로 넣는다고 가정
                duration = r.state.get("duration_min", 0)
                if not isinstance(duration, (int, float)) or duration < trigger["duration_min_gte"]:
                    continue
            # transition_from — 이전 상태가 on이었던 OFF 이벤트
            if "transition_from" in trigger:
                if r.state.get("transition_from") != trigger["transition_from"]:
                    continue
            if "prev_on_within_min" in trigger:
                prev_on = r.state.get("prev_on_within_min", 0)
                if prev_on > trigger["prev_on_within_min"]:
                    continue
            return True

        return False


# ─────────────────────────── helpers ───────────────────────────


class _Context:
    """런타임 평가 컨텍스트."""

    def __init__(self, current_time: str, weekday: int, sleep_time: str):
        self.current_time = current_time
        self.weekday = weekday
        self.sleep_time = sleep_time
        self.now = _today_with_hhmm(current_time)
        self._sleep = _today_with_hhmm(sleep_time)
        if self._sleep < self.now:
            self._sleep += timedelta(days=1)
        self.time_to_sleep_min = int((self._sleep - self.now).total_seconds() // 60)


def _today_with_hhmm(hhmm: str) -> datetime:
    h, m = map(int, hhmm.split(":"))
    today = datetime.now().replace(hour=h, minute=m, second=0, microsecond=0)
    return today


def _check_context(ctx_cond: dict[str, Any], ctx: _Context) -> bool:
    if "time_to_sleep_min_lte" in ctx_cond:
        if ctx.time_to_sleep_min > ctx_cond["time_to_sleep_min_lte"]:
            return False
    return True


def _match_state(spec: dict[str, Any], r: SensorReading) -> bool:
    """state spec과 reading.state 비교. _gte/_gt/_lte 접미사 지원."""
    for key, expected in spec.items():
        if key == "any_room":
            if expected and not (r.room_id or r.state.get("room_id")):
                return False
            continue
        if key.endswith("_gte"):
            base = key[:-4]
            actual = r.state.get(base)
            if not isinstance(actual, (int, float)) or actual < expected:
                return False
            continue
        if key.endswith("_gt"):
            base = key[:-3]
            actual = r.state.get(base)
            if not isinstance(actual, (int, float)) or actual <= expected:
                return False
            continue
        if key.endswith("_lte"):
            base = key[:-4]
            actual = r.state.get(base)
            if not isinstance(actual, (int, float)) or actual > expected:
                return False
            continue
        # 단순 동등
        if r.state.get(key) != expected:
            return False
    return True


def _within_window(ts: datetime, now: datetime, minutes: int) -> bool:
    """ts(센서 발생 wall-clock) 가 now(실제 wall-clock) 기준 minutes 이내인지.

    ctx.current_time(HH:MM)은 시뮬레이션용 가상 시각이라 ts와 직접 비교 못 함.
    실 wall-clock 차이를 본다.
    """
    ts_naive = ts.replace(tzinfo=None) if ts.tzinfo else ts
    wall_now = datetime.now()
    delta = (wall_now - ts_naive).total_seconds() / 60
    return 0 <= delta <= minutes


def _dedup(events: Iterable[InferredEvent]) -> list[InferredEvent]:
    """같은 event_id가 여러 규칙에서 발생하면 confidence max로 합치고 triggered_by 합집합."""
    by_id: dict[str, InferredEvent] = {}
    for e in events:
        existing = by_id.get(e.event_id)
        if existing is None or e.confidence > existing.confidence:
            if existing is None:
                by_id[e.event_id] = e
                continue
            merged_trig = list(dict.fromkeys(existing.triggered_by + e.triggered_by))
            merged_desc = list(dict.fromkeys(existing.rule_descriptions + e.rule_descriptions))
            by_id[e.event_id] = InferredEvent(
                event_id=e.event_id,
                confidence=e.confidence,
                source=e.source,
                triggered_by=merged_trig,
                rule_descriptions=merged_desc,
            )
        else:
            existing_trig = list(dict.fromkeys(existing.triggered_by + e.triggered_by))
            existing_desc = list(dict.fromkeys(existing.rule_descriptions + e.rule_descriptions))
            by_id[e.event_id] = InferredEvent(
                event_id=existing.event_id,
                confidence=existing.confidence,
                source=existing.source,
                triggered_by=existing_trig,
                rule_descriptions=existing_desc,
            )
    return sorted(by_id.values(), key=lambda e: e.confidence, reverse=True)
