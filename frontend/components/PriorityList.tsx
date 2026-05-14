import type { RoomScore } from "@/lib/types";
import { ROOM_LABEL } from "@/lib/types";
import { MODE_BADGE } from "@/lib/colors";

export function PriorityList({ rooms }: { rooms: RoomScore[] }) {
  return (
    <div className="bg-white border border-line rounded-xl p-4 shadow-sm">
      <h2 className="text-[16px] font-semibold mb-3">청소 우선순위</h2>
      <ul className="space-y-1.5">
        {rooms.map((r) => {
          const badge = MODE_BADGE[r.mode];
          return (
            <li
              key={r.room_id}
              className={`flex items-start justify-between p-2 rounded-md hover:bg-paper
                ${r.mode === "excluded" ? "opacity-70" : ""}`}
            >
              <div className="min-w-0">
                <span
                  className={`text-[14px] font-medium ${
                    r.mode === "excluded" ? "line-through text-ink-2" : "text-ink"
                  }`}
                >
                  {ROOM_LABEL[r.room_id]}
                </span>
                <span className="ml-2 text-[13px] text-ink-3 font-mono">
                  {r.final}점
                </span>
                {r.exclusion_reason && r.mode === "excluded" && (
                  <div className="text-[11px] text-ink-3 mt-0.5">
                    {r.exclusion_reason}
                  </div>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                  text-[11px] font-semibold whitespace-nowrap shrink-0 ${badge.cls}`}
              >
                <span aria-hidden>{badge.prefix}</span>
                {badge.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
