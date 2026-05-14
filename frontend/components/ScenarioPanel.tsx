"use client";
import type { EventMeta, ScenarioMeta } from "@/lib/types";
import { ROOM_LABEL } from "@/lib/types";

type Props = {
  scenarios: ScenarioMeta[];
  events: EventMeta[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
};

const MAX_CHIPS = 3;

export function ScenarioPanel({
  scenarios,
  events,
  selectedId,
  loading,
  onSelect,
}: Props) {
  if (scenarios.length === 0) {
    return (
      <div className="text-[13px] text-ink-3">시나리오를 불러오는 중…</div>
    );
  }
  const eventLabel = new Map(events.map((e) => [e.id, e.name_ko]));
  return (
    <div className="grid grid-cols-2 gap-3">
      {scenarios.map((s) => {
        const active = s.id === selectedId;
        const chips = s.active_events.slice(0, MAX_CHIPS);
        const overflow = s.active_events.length - chips.length;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            disabled={loading}
            aria-pressed={active}
            className={`p-4 rounded-xl border text-left transition
              ${
                active
                  ? "bg-lg-red text-white border-lg-red shadow-md"
                  : "bg-white hover:bg-paper border-line"
              }
              ${loading ? "opacity-50 cursor-wait" : ""}
              focus:outline-none focus:ring-2 focus:ring-lg-red/40`}
          >
            <div className="text-[16px] font-semibold leading-tight">
              {s.name_ko}
            </div>
            <div
              className={`text-[12px] mt-1.5 ${
                active ? "text-white/80" : "text-ink-3"
              }`}
            >
              🕒 {s.current_time} · 😴 취침 {s.sleep_time}
              {s.user_location &&
                ` · 📍 ${ROOM_LABEL[s.user_location]}`}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {chips.map((eid) => (
                <span
                  key={eid}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium border
                    ${
                      active
                        ? "bg-white/20 text-white border-white/30"
                        : "bg-paper text-ink border-line-2"
                    }`}
                >
                  {eventLabel.get(eid) ?? eid}
                </span>
              ))}
              {overflow > 0 && (
                <span
                  className={`text-[11px] ${
                    active ? "text-white/70" : "text-ink-3"
                  }`}
                >
                  +{overflow}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
