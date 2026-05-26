"use client";
import { useEffect, useRef, useState } from "react";
import { ROOMS_SEED, ROOM_LABEL, type Mode, type RoomId, type RoomScore } from "@/lib/types";
import { scoreToFill } from "@/lib/colors";

type Props = {
  rooms?: RoomScore[];
  userLocation?: RoomId | null;
  onRoomClick?: (roomId: RoomId) => void;
};

type Furniture = { d: string; transform?: string };

const FURNITURE: Partial<Record<RoomId, Furniture[]>> = {
  living: [
    { d: "M 0 0 h 80 v 16 h -80 z", transform: "translate(140 130)" },
    { d: "M 0 0 h 80 v 4 h -80 z", transform: "translate(140 124)" },
    { d: "M 18 8 v 8 M 40 8 v 8 M 62 8 v 8", transform: "translate(140 130)" },
    { d: "M 0 0 h 14 v 14 h -14 z", transform: "translate(232 122)" },
  ],
  bedroom: [
    { d: "M 0 0 h 70 v 50 h -70 z", transform: "translate(20 215)" },
    { d: "M 0 -4 h 70 v 4 h -70 z", transform: "translate(20 215)" },
    { d: "M 0 0 h 28 v 10 h -28 z", transform: "translate(24 219)" },
    { d: "M 0 0 h 28 v 10 h -28 z", transform: "translate(58 219)" },
    { d: "M 35 30 m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0", transform: "translate(20 215)" },
  ],
  kitchen: [
    { d: "M 0 0 h 96 v 12 h -96 z", transform: "translate(302 16)" },
    { d: "M 0 0 v -6 h 10", transform: "translate(336 16)" },
    { d: "M 70 6 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0", transform: "translate(302 16)" },
  ],
  bathroom: [
    {
      d: "M 6 0 h 78 a 6 6 0 0 1 6 6 v 38 a 6 6 0 0 1 -6 6 h -78 a 6 6 0 0 1 -6 -6 v -38 a 6 6 0 0 1 6 -6 z",
      transform: "translate(305 218)",
    },
    { d: "M 12 8 h 66 v 4 h -66 z", transform: "translate(305 218)" },
  ],
  entrance: [
    { d: "M 0 0 a 6 4 0 1 0 12 0 a 6 4 0 1 0 -12 0", transform: "translate(20 140)" },
    { d: "M 0 0 a 6 4 0 1 0 12 0 a 6 4 0 1 0 -12 0", transform: "translate(44 140)" },
    { d: "M -2 -2 l 16 0", transform: "translate(20 146)" },
    { d: "M -2 -2 l 16 0", transform: "translate(44 146)" },
  ],
};

const DOORS = [
  { x: 78, y: 110, w: 4, h: 18 },
  { x: 278, y: 30, w: 4, h: 18 },
  { x: 170, y: 178, w: 18, h: 4 },
  { x: 340, y: 98, w: 18, h: 4 },
  { x: 30, y: 178, w: 18, h: 4 },
];

function scoreTextColor(score: number, mode: Mode): string {
  if (mode === "excluded") return "#6B6B6B";
  if (score >= 50) return "#1A1A1A";
  return "#4B4B4B";
}

function PersonIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={2} r={11} fill="white" stroke="#1A1A1A" strokeWidth={1.2} />
      <circle cx={0} cy={-7} r={3.2} fill="#1A1A1A" />
      <path d="M -5 4 q 5 -3.5 10 0 v 6 q -5 3 -10 0 z" fill="#1A1A1A" />
      <text x={0} y={24} textAnchor="middle" style={{ font: "600 9px var(--font-sans)", fill: "#1A1A1A", letterSpacing: "0.04em" }}>
        사용자
      </text>
    </g>
  );
}

function RobotIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="transition-transform duration-1000 ease-in-out" style={{ transform: `translate(${x}px, ${y}px)` }}>
      <circle cx={0} cy={0} r={14} fill="oklch(45% 0 0)" opacity={0.12}>
        <animate attributeName="r" values="14;18;14" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.12;0.06;0.12" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={0} cy={0} r={10} fill="oklch(30% 0 0)" stroke="white" strokeWidth={1.5} />
      <circle cx={-3} cy={-2} r={1.5} fill="white" />
      <circle cx={3} cy={-2} r={1.5} fill="white" />
      <path d="M -4 3 q 4 3 8 0" stroke="white" strokeWidth={1} fill="none" strokeLinecap="round" />
      <text x={0} y={22} textAnchor="middle" style={{ font: "600 8px var(--font-sans)", fill: "oklch(30% 0 0)", letterSpacing: "0.04em" }}>
        청소기
      </text>
    </g>
  );
}

function useCountUp(target: number, duration = 400): number {
  const [val, setVal] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    prevRef.current = target;
    if (from === to) return;

    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return val;
}

function AnimatedScore({ score, mode }: { score: number; mode: Mode }) {
  const display = useCountUp(score);
  return (
    <text
      textAnchor="middle"
      style={{ font: "600 12px var(--font-mono)", fill: scoreTextColor(score, mode) }}
    >
      {display}
    </text>
  );
}

function buildAriaLabel(rooms?: RoomScore[], userLocation?: RoomId | null): string {
  if (!rooms || rooms.length === 0) {
    const parts = ROOMS_SEED.map((r) => `${r.name_ko} ${r.base_score}점`);
    return `집 평면도. ${parts.join(", ")}.`;
  }
  const parts = rooms.map((r) => {
    const mode = r.mode === "excluded" ? " 제외" : r.mode === "quiet" ? " 저소음" : r.mode === "delayed" ? " 지연" : "";
    return `${ROOM_LABEL[r.room_id]} ${r.final}점${mode}`;
  });
  const userPart = userLocation ? ` 사용자 위치 ${ROOM_LABEL[userLocation]}.` : "";
  return `집 평면도. ${parts.join(", ")}.${userPart}`;
}

const LEGEND_STEPS = [96, 90, 84, 78, 72, 66];

function HeatmapLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[11px] text-gray-500">
      <span className="font-medium text-text-muted">청소 우선순위</span>
      <div className="flex items-center gap-1.5">
        <span>낮음</span>
        <span className="flex" aria-hidden="true">
          {LEGEND_STEPS.map((l) => (
            <span key={l} className="block w-4 h-2.5 border-y border-l border-border-default last:border-r" style={{ background: `oklch(${l}% 0 0)` }} />
          ))}
        </span>
        <span>높음</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg width={16} height={10} aria-hidden="true" className="border border-border-default">
          <defs><pattern id="hatch-legend" patternUnits="userSpaceOnUse" width="4" height="4"><path d="M0 4 L4 0" stroke="#9ca3af" strokeWidth="0.8" /></pattern></defs>
          <rect width={16} height={10} fill="url(#hatch-legend)" />
        </svg>
        <span>제외 (저소음 시간대 등)</span>
      </div>
    </div>
  );
}

export function HouseMap({ rooms, userLocation, onRoomClick }: Props) {
  const scoreMap = new Map(rooms?.map((r) => [r.room_id, r]) ?? []);
  const ariaLabel = buildAriaLabel(rooms, userLocation);
  const [hoveredRoom, setHoveredRoom] = useState<RoomId | null>(null);

  const topRoom = rooms?.filter((r) => r.mode !== "excluded").sort((a, b) => b.final - a.final)[0];
  const robotTarget = topRoom ? ROOMS_SEED.find((r) => r.id === topRoom.room_id) : null;

  return (
    <div>
      <svg
        viewBox="0 0 420 280"
        role="img"
        aria-label={ariaLabel}
        className="w-full h-auto border border-border-default rounded-xl bg-white shadow-[0_4px_24px_-12px_rgba(0,0,0,0.25)]"
      >
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6">
            <path d="M0 6 L6 0" stroke="#9ca3af" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Layer 1: 방 채우기 — CSS transition으로 색상 변경 */}
        {ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const mode = (s?.mode ?? "normal") as Mode;
          const isHovered = hoveredRoom === room.id;
          return (
            <rect
              key={`fill-${room.id}`}
              x={room.bbox.x}
              y={room.bbox.y}
              width={room.bbox.w}
              height={room.bbox.h}
              fill={scoreToFill(score, mode)}
              stroke={isHovered ? "oklch(30% 0 0)" : "#1A1A1A"}
              strokeWidth={isHovered ? 2.5 : 1.5}
              style={{ transition: "fill 0.6s ease, stroke-width 0.2s ease", cursor: onRoomClick ? "pointer" : "default" }}
              onMouseEnter={() => setHoveredRoom(room.id)}
              onMouseLeave={() => setHoveredRoom(null)}
              onClick={() => onRoomClick?.(room.id)}
            />
          );
        })}

        {/* Layer 2: 가구 */}
        {ROOMS_SEED.map((room) =>
          (FURNITURE[room.id] ?? []).map((f, i) => (
            <path
              key={`fur-${room.id}-${i}`}
              d={f.d}
              transform={f.transform}
              stroke="#6B6B6B"
              strokeWidth={1}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ pointerEvents: "none" }}
            />
          )),
        )}

        {/* Layer 3: 외벽 */}
        <rect x={0} y={0} width={420} height={280} fill="none" stroke="#1A1A1A" strokeWidth={3} style={{ pointerEvents: "none" }} />

        {/* Layer 4: 문 */}
        {DOORS.map((d, i) => (
          <rect key={`door-${i}`} x={d.x} y={d.y} width={d.w} height={d.h} fill="#FFFFFF" style={{ pointerEvents: "none" }} />
        ))}

        {/* Layer 5: 라벨 + 애니메이션 점수 */}
        {ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const mode = (s?.mode ?? "normal") as Mode;
          const cx = room.bbox.x + room.bbox.w / 2;
          const cy = room.bbox.y + room.bbox.h / 2;
          return (
            <g key={`label-${room.id}`} style={{ pointerEvents: "none" }}>
              <text x={cx} y={cy - 4} textAnchor="middle" style={{ font: "500 14px var(--font-sans)", fill: scoreTextColor(score, mode) }}>
                {room.name_ko}
              </text>
              <g transform={`translate(${cx}, ${cy + 14})`}>
                <AnimatedScore score={score} mode={mode} />
              </g>
            </g>
          );
        })}

        {/* Layer 6: 사용자 아이콘 */}
        {userLocation &&
          (() => {
            const room = ROOMS_SEED.find((r) => r.id === userLocation);
            if (!room) return null;
            return <PersonIcon x={room.bbox.x + room.bbox.w - 22} y={room.bbox.y + 22} />;
          })()}

        {/* Layer 7: 로봇 청소기 (우선순위 1위 방으로 이동) */}
        {robotTarget && (
          <RobotIcon
            x={robotTarget.bbox.x + 24}
            y={robotTarget.bbox.y + robotTarget.bbox.h - 24}
          />
        )}
      </svg>
      <HeatmapLegend />
    </div>
  );
}
