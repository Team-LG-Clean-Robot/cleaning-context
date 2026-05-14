from app.schemas.room import Room
from app.schemas.simulation import Mode, RoomScore, ScoreContribution
from app.services.context_builder import ScoringContext


def _room_contributions(
    room: Room, ctx: ScoringContext, rules: dict
) -> list[ScoreContribution]:
    out: list[ScoreContribution] = [
        ScoreContribution(source="base", label_ko="기본 점수", delta=room.base_score)
    ]
    for ev in ctx.resolved_events:
        for eff in ev.effects:
            if eff.room_id == "*":
                if room.id in ctx.gap_rooms:
                    out.append(
                        ScoreContribution(source=ev.id, label_ko=ev.name_ko, delta=eff.delta)
                    )
            elif eff.room_id == room.id:
                out.append(
                    ScoreContribution(source=ev.id, label_ko=ev.name_ko, delta=eff.delta)
                )

    mods = rules["modifiers"]

    if ctx.scenario.user_location == room.id:
        out.append(
            ScoreContribution(
                source="user_occupancy",
                label_ko="사용자 머무름",
                delta=mods["user_occupancy_delta"],
            )
        )

    pre_sleep_active = any(ev.id == "pre_sleep_30min" for ev in ctx.resolved_events)
    if pre_sleep_active and room.noise_sensitivity >= mods["noise_sleep_threshold"]:
        out.append(
            ScoreContribution(
                source="noise_sleep_extra",
                label_ko="소음 민감도×취침 임박",
                delta=mods["noise_sleep_extra_delta"],
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
