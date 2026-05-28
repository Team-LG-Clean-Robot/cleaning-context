from app.schemas.room import Room
from app.schemas.simulation import Axis, Mode, RoomScore, ScoreContribution
from app.services.context_builder import ScoringContext

# 두 축 분류: 이벤트가 청소 우선순위에 영향을 주는 방식
#   - need        : 방을 더럽게 만들거나 더러움이 누적된 신호 (dirt accumulation)
#   - opportunity : 지금 청소해도 되는지에 대한 신호 (timing / calendar / user)
_EVENT_AXIS: dict[str, Axis] = {
    "rain": "need",
    "user_returned": "need",
    "user_left": "need",
    "cooking_done": "need",
    "cooking_active": "need",
    "meal_prep": "need",
    "recent_shower": "need",
    "tv_watching": "need",
    "cleanup_gap_2d": "need",
    "pre_sleep_30min": "opportunity",
    "pre_sleep_2h": "opportunity",
    "guest_arriving_2h": "opportunity",
    "guest_visit_recent": "opportunity",
}


def _event_axis(event_id: str) -> Axis:
    return _EVENT_AXIS.get(event_id, "need")


def _room_contributions(
    room: Room, ctx: ScoringContext, rules: dict
) -> list[ScoreContribution]:
    out: list[ScoreContribution] = [
        ScoreContribution(
            source="base", label_ko="기본 점수", delta=room.base_score, axis="need"
        )
    ]
    for ev in ctx.resolved_events:
        axis = _event_axis(ev.id)
        for eff in ev.effects:
            if eff.room_id == "*":
                if room.id in ctx.gap_rooms:
                    out.append(
                        ScoreContribution(
                            source=ev.id, label_ko=ev.name_ko, delta=eff.delta, axis=axis
                        )
                    )
            elif eff.room_id == room.id:
                out.append(
                    ScoreContribution(
                        source=ev.id, label_ko=ev.name_ko, delta=eff.delta, axis=axis
                    )
                )

    mods = rules["modifiers"]

    if ctx.scenario.user_location == room.id:
        out.append(
            ScoreContribution(
                source="user_occupancy",
                label_ko="사용자 머무름",
                delta=mods["user_occupancy_delta"],
                axis="opportunity",
            )
        )

    pre_sleep_active = any(ev.id == "pre_sleep_30min" for ev in ctx.resolved_events)
    if pre_sleep_active and room.noise_sensitivity >= mods["noise_sleep_threshold"]:
        out.append(
            ScoreContribution(
                source="noise_sleep_extra",
                label_ko="소음 민감도×취침 임박",
                delta=mods["noise_sleep_extra_delta"],
                axis="opportunity",
            )
        )

    return out


def _decide_mode(
    room: Room, final: int, ctx: ScoringContext, rules: dict
) -> tuple[Mode, str | None]:
    mods = rules["modifiers"]

    if final < mods["exclusion_threshold"]:
        return "excluded", None  # 사유는 호출부에서 dominant negative로 채움

    if ctx.scenario.user_location == room.id and final > 0:
        return "delayed", f"{mods['delayed_minutes']}분 후 재시도"

    pre_sleep_active = any(ev.id == "pre_sleep_30min" for ev in ctx.resolved_events)
    if (
        pre_sleep_active
        and room.noise_sensitivity >= mods["quiet_noise_threshold"]
        and final > 0
    ):
        return "quiet", "취침 임박 — 저소음 모드"

    return "normal", None


def compute_scores(
    ctx: ScoringContext, rooms: dict[str, Room], rules: dict
) -> list[RoomScore]:
    results: list[RoomScore] = []
    for room in rooms.values():
        contribs = _room_contributions(room, ctx, rules)
        final = sum(c.delta for c in contribs)
        mode, reason = _decide_mode(room, final, ctx, rules)
        if mode == "excluded":
            neg = min(contribs, key=lambda c: c.delta)
            reason = f"{neg.label_ko} ({neg.delta:+d})"
        results.append(
            RoomScore(
                room_id=room.id,
                base=room.base_score,
                breakdown=contribs,
                final=final,
                mode=mode,
                exclusion_reason=reason,
            )
        )
    return sorted(results, key=lambda r: r.final, reverse=True)
