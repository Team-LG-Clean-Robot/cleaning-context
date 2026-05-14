from dataclasses import dataclass

from app.schemas.event import Event
from app.schemas.scenario import Scenario
from app.schemas.simulation import CustomContext


@dataclass(frozen=True)
class ScoringContext:
    scenario: Scenario
    resolved_events: tuple[Event, ...]
    gap_rooms: tuple[str, ...]


def build_context(
    scenario_id: str,
    scenarios: dict[str, Scenario],
    events: dict[str, Event],
) -> ScoringContext:
    sc = scenarios[scenario_id]  # KeyError → router에서 404로 변환
    resolved = tuple(events[eid] for eid in sc.active_events)
    return ScoringContext(scenario=sc, resolved_events=resolved, gap_rooms=tuple(sc.gap_rooms))


def build_custom_context(
    custom: CustomContext,
    events: dict[str, Event],
) -> ScoringContext:
    resolved = tuple(events[eid] for eid in custom.active_events)
    pseudo = Scenario(
        id="__custom__",
        name_ko="직접 입력",
        description="사용자 정의 시나리오",
        current_time=custom.current_time,
        sleep_time=custom.sleep_time,
        user_location=custom.user_location,
        active_events=list(custom.active_events),
        gap_rooms=list(custom.gap_rooms),
    )
    return ScoringContext(
        scenario=pseudo,
        resolved_events=resolved,
        gap_rooms=tuple(custom.gap_rooms),
    )
