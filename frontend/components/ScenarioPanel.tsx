"use client";
import type { EventMeta, ScenarioMeta } from "@/lib/types";
import { ROOM_LABEL } from "@/lib/types";
import { ClockIcon, MoonIcon, PinIcon } from "./icons";

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
      <div className="text-[13px] text-gray-500">시나리오를 불러오는 중…</div>
    );
  }
  const eventLabel = new Map(events.map((e) => [e.id, e.name_ko]));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
            className={`p-4 rounded-xl border text-left transition duration-150 ease-out
              ${
                active
                  ? "bg-action-primary text-white border-action-primary shadow-md"
                  : "bg-white hover:bg-surface-base hover:-translate-y-0.5 hover:shadow-sm border-border-default"
              }
              ${loading ? "opacity-50 cursor-wait" : ""}
              focus:outline-none focus:ring-2 focus:ring-action-primary/40`}
          >
            <div className="text-[16px] font-semibold leading-tight">
              {s.name_ko}
            </div>
            {s.description && (
              <div
                className={`text-[11.5px] mt-1 leading-snug ${
                  active ? "text-white/85" : "text-text-muted"
                }`}
              >
                {s.description}
              </div>
            )}
            <div
              className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] mt-1.5 ${
                active ? "text-white/80" : "text-gray-500"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {s.current_time}
              </span>
              <span className="inline-flex items-center gap-1">
                <MoonIcon className="w-3 h-3" />
                취침 {s.sleep_time}
              </span>
              {s.user_location && (
                <span className="inline-flex items-center gap-1">
                  <PinIcon className="w-3 h-3" />
                  {ROOM_LABEL[s.user_location]}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {chips.map((eid) => (
                <span
                  key={eid}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium border
                    ${
                      active
                        ? "bg-white/20 text-white border-white/30"
                        : "bg-surface-base text-text-default border-border-default"
                    }`}
                >
                  {eventLabel.get(eid) ?? eid}
                </span>
              ))}
              {overflow > 0 && (
                <span
                  className={`text-[11px] ${
                    active ? "text-white/70" : "text-gray-500"
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
