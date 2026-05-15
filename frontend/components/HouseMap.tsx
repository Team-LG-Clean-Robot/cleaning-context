"use client";
import { ROOMS_SEED, ROOM_LABEL, type Mode, type RoomId, type RoomScore } from "@/lib/types";
import { scoreToFill } from "@/lib/colors";

type Props = { rooms?: RoomScore[]; userLocation?: RoomId | null };

type Furniture = { d: string; transform?: string };

// 새 bbox 기준 가구 배치. 침실 베드 헤드보드·소파 쿠션·싱크홀 등 미세 디테일.
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

// 문 (흰색 사각형으로 벽 끊기) — 새 bbox 경계에 맞춤
const DOORS = [
  { x: 78, y: 110, w: 4, h: 18 }, // entrance ↔ living
  { x: 278, y: 30, w: 4, h: 18 }, // living ↔ kitchen
  { x: 170, y: 178, w: 18, h: 4 }, // living ↔ bedroom
  { x: 340, y: 98, w: 18, h: 4 }, // kitchen ↔ bathroom
  { x: 30, y: 178, w: 18, h: 4 }, // entrance ↔ bedroom
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
      <path
        d="M -5 4 q 5 -3.5 10 0 v 6 q -5 3 -10 0 z"
        fill="#1A1A1A"
      />
      <text
        x={0}
        y={24}
        textAnchor="middle"
        style={{
          font: "600 9px var(--font-sans)",
          fill: "#1A1A1A",
          letterSpacing: "0.04em",
        }}
      >
        사용자
      </text>
    </g>
  );
}

function buildAriaLabel(rooms?: RoomScore[], userLocation?: RoomId | null): string {
  if (!rooms || rooms.length === 0) {
    const parts = ROOMS_SEED.map((r) => `${r.name_ko} ${r.base_score}점`);
    return `집 평면도. ${parts.join(", ")}.`;
  }
  const parts = rooms.map((r) => {
    const mode =
      r.mode === "excluded"
        ? " 제외"
        : r.mode === "quiet"
          ? " 저소음"
          : r.mode === "delayed"
            ? " 지연"
            : "";
    return `${ROOM_LABEL[r.room_id]} ${r.final}점${mode}`;
  });
  const userPart = userLocation
    ? ` 사용자 위치 ${ROOM_LABEL[userLocation]}.`
    : "";
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
            <span
              key={l}
              className="block w-4 h-2.5 border-y border-l border-border-default last:border-r"
              style={{ background: `oklch(${l}% 0 0)` }}
            />
          ))}
        </span>
        <span>높음</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg width={16} height={10} aria-hidden="true" className="border border-border-default">
          <defs>
            <pattern id="hatch-legend" patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M0 4 L4 0" stroke="#9ca3af" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width={16} height={10} fill="url(#hatch-legend)" />
        </svg>
        <span>제외 (저소음 시간대 등)</span>
      </div>
    </div>
  );
}

export function HouseMap({ rooms, userLocation }: Props) {
  const scoreMap = new Map(rooms?.map((r) => [r.room_id, r]) ?? []);
  const ariaLabel = buildAriaLabel(rooms, userLocation);

  return (
    <div>
    <svg
      viewBox="0 0 420 280"
      role="img"
      aria-label={ariaLabel}
      className="w-full h-auto border border-border-default rounded-xl bg-white shadow-[0_4px_24px_-12px_rgba(0,0,0,0.25)]"
    >
      <defs>
        <pattern
          id="hatch"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <path d="M0 6 L6 0" stroke="#9ca3af" strokeWidth="1" />
        </pattern>
        <filter id="room-shadow" x="-2%" y="-2%" width="104%" height="104%">
          <feGaussianBlur stdDeviation="0.6" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.35" />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
          <feComposite in="SourceGraphic" operator="over" />
        </filter>
      </defs>

      {/* Layer 1: 방 채우기 + 내벽 */}
      {ROOMS_SEED.map((room) => {
        const s = scoreMap.get(room.id);
        const score = s?.final ?? room.base_score;
        const mode = (s?.mode ?? "normal") as Mode;
        return (
          <rect
            key={`fill-${room.id}`}
            x={room.bbox.x}
            y={room.bbox.y}
            width={room.bbox.w}
            height={room.bbox.h}
            fill={scoreToFill(score, mode)}
            stroke="#1A1A1A"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Layer 2: 가구 힌트 */}
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
          />
        )),
      )}

      {/* Layer 3: 외벽 강조 */}
      <rect
        x={0}
        y={0}
        width={420}
        height={280}
        fill="none"
        stroke="#1A1A1A"
        strokeWidth={3}
      />

      {/* Layer 4: 문 (벽 끊기) */}
      {DOORS.map((d, i) => (
        <rect
          key={`door-${i}`}
          x={d.x}
          y={d.y}
          width={d.w}
          height={d.h}
          fill="#FFFFFF"
        />
      ))}

      {/* Layer 5: 라벨 + 점수 */}
      {ROOMS_SEED.map((room) => {
        const s = scoreMap.get(room.id);
        const score = s?.final ?? room.base_score;
        const mode = (s?.mode ?? "normal") as Mode;
        const cx = room.bbox.x + room.bbox.w / 2;
        const cy = room.bbox.y + room.bbox.h / 2;
        const textFill = scoreTextColor(score, mode);
        return (
          <g key={`label-${room.id}`}>
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              style={{
                font: "500 14px var(--font-sans)",
                fill: textFill,
              }}
            >
              {room.name_ko}
            </text>
            <text
              x={cx}
              y={cy + 14}
              textAnchor="middle"
              style={{
                font: "600 12px var(--font-mono)",
                fill: textFill,
              }}
            >
              {score}
            </text>
          </g>
        );
      })}

      {/* Layer 6: 사용자 아이콘 */}
      {userLocation &&
        (() => {
          const room = ROOMS_SEED.find((r) => r.id === userLocation);
          if (!room) return null;
          const x = room.bbox.x + room.bbox.w - 22;
          const y = room.bbox.y + 22;
          return <PersonIcon x={x} y={y} />;
        })()}
    </svg>
    <HeatmapLegend />
    </div>
  );
}
