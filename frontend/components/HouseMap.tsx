"use client";
import { ROOMS_SEED, ROOM_LABEL, type Mode, type RoomId, type RoomScore } from "@/lib/types";
import { scoreToFill } from "@/lib/colors";

type Props = { rooms?: RoomScore[]; userLocation?: RoomId | null };

type Furniture = { d: string; transform?: string };

// 새 bbox 기준 가구 배치
const FURNITURE: Partial<Record<RoomId, Furniture[]>> = {
  living: [
    { d: "M 0 0 h 80 v 16 h -80 z", transform: "translate(140 130)" },
    { d: "M 0 0 h 80 v 4 h -80 z", transform: "translate(140 124)" },
    { d: "M 0 0 h 14 v 14 h -14 z", transform: "translate(232 122)" },
  ],
  bedroom: [
    { d: "M 0 0 h 70 v 50 h -70 z", transform: "translate(20 215)" },
    { d: "M 0 0 h 28 v 10 h -28 z", transform: "translate(24 219)" },
    { d: "M 0 0 h 28 v 10 h -28 z", transform: "translate(58 219)" },
  ],
  kitchen: [
    { d: "M 0 0 h 100 v 18 h -100 z", transform: "translate(300 22)" },
    { d: "M 0 0 v -8 h 12", transform: "translate(340 22)" },
  ],
  bathroom: [
    {
      d: "M 6 0 h 88 a 6 6 0 0 1 6 6 v 48 a 6 6 0 0 1 -6 6 h -88 a 6 6 0 0 1 -6 -6 v -48 a 6 6 0 0 1 6 -6 z",
      transform: "translate(300 180)",
    },
  ],
  entrance: [
    { d: "M 0 0 a 6 4 0 1 0 12 0 a 6 4 0 1 0 -12 0", transform: "translate(20 140)" },
    { d: "M 0 0 a 6 4 0 1 0 12 0 a 6 4 0 1 0 -12 0", transform: "translate(44 140)" },
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
      <circle cx={0} cy={-8} r={4} fill="#A50034" />
      <path
        d="M -6 0 q 6 -4 12 0 v 10 q -6 4 -12 0 z"
        fill="#A50034"
      />
      <text
        x={0}
        y={22}
        textAnchor="middle"
        style={{
          font: "500 10px var(--font-sans)",
          fill: "#A50034",
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

export function HouseMap({ rooms, userLocation }: Props) {
  const scoreMap = new Map(rooms?.map((r) => [r.room_id, r]) ?? []);
  const ariaLabel = buildAriaLabel(rooms, userLocation);

  return (
    <svg
      viewBox="0 0 420 280"
      role="img"
      aria-label={ariaLabel}
      className="w-full h-auto border border-line rounded-xl bg-white shadow-sm"
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
  );
}
