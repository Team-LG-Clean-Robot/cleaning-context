"use client";
import { useEffect, useRef, useState } from "react";
import { ROOMS_SEED, ROOM_LABEL, type Mode, type RoomId, type RoomScore } from "@/lib/types";
import { scoreToFill } from "@/lib/colors";

type Props = {
  rooms?: RoomScore[];
  userLocation?: RoomId | null;
  onRoomClick?: (roomId: RoomId) => void;
};

// ── 벽 + 문 (이미지 위에 오버레이) ──────────────────────────

function Walls() {
  return (
    <g stroke="#1a1a1a" fill="none" style={{ pointerEvents: "none" }}>
      {/* 외벽 */}
      <rect x={12} y={12} width={536} height={380} strokeWidth={4} rx={1} />
      {/* 수평 내벽 — 상하 분할 */}
      <line x1={12} y1={184} x2={548} y2={184} strokeWidth={3} />
      {/* 수직 — 침실 | 주방 */}
      <line x1={192} y1={12} x2={192} y2={184} strokeWidth={3} />
      {/* 수직 — 현관 | 거실 */}
      <line x1={112} y1={184} x2={112} y2={392} strokeWidth={3} />
      {/* 수직 — 거실 | 욕실 */}
      <line x1={396} y1={184} x2={396} y2={392} strokeWidth={3} />

      {/* 문 (흰색으로 벽 끊기) */}
      <rect x={190} y={80} width={5} height={36} fill="white" stroke="none" />
      <rect x={80} y={182} width={30} height={5} fill="white" stroke="none" />
      <rect x={240} y={182} width={36} height={5} fill="white" stroke="none" />
      <rect x={394} y={280} width={5} height={36} fill="white" stroke="none" />
      <rect x={110} y={300} width={5} height={36} fill="white" stroke="none" />

      {/* 문 아크 */}
      <path d="M 195 80 Q 220 80 220 98" strokeWidth={0.6} strokeDasharray="2 2" />
      <path d="M 80 182 Q 80 160 98 160" strokeWidth={0.6} strokeDasharray="2 2" />
      <path d="M 276 182 Q 276 162 258 162" strokeWidth={0.6} strokeDasharray="2 2" />
      <path d="M 396 316 Q 416 316 416 300" strokeWidth={0.6} strokeDasharray="2 2" />
      <path d="M 112 300 Q 132 300 132 318" strokeWidth={0.6} strokeDasharray="2 2" />
    </g>
  );
}

// ── 점수 텍스트 색상 ─────────────────────────────────────────

function scoreTextColor(score: number, mode: Mode): string {
  if (mode === "excluded") return "#888";
  if (score >= 50) return "#fff";
  if (score >= 30) return "#1a1a1a";
  return "#4a4a4a";
}

function scoreBgColor(score: number, mode: Mode): string {
  if (mode === "excluded") return "rgba(0,0,0,0.15)";
  if (score >= 50) return "rgba(0,0,0,0.55)";
  if (score >= 30) return "rgba(255,255,255,0.7)";
  return "rgba(255,255,255,0.5)";
}

// ── 아이콘 ───────────────────────────────────────────────────

function PersonIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: "none" }}>
      <circle cx={0} cy={0} r={12} fill="white" stroke="#1a1a1a" strokeWidth={1.2} />
      <circle cx={0} cy={-5} r={3.5} fill="#1a1a1a" />
      <path d="M -5 1 q 5 -3 10 0 v 5 q -5 3 -10 0 z" fill="#1a1a1a" />
      <text x={0} y={22} textAnchor="middle" style={{ font: "600 9px var(--font-sans)", fill: "#1a1a1a" }}>사용자</text>
    </g>
  );
}

function RobotIcon({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)` }} className="transition-transform duration-1000 ease-in-out">
      {/* 펄스 링 */}
      <circle cx={0} cy={0} r={18} fill="none" stroke="oklch(45% 0 0)" strokeWidth={1.5} opacity={0.3}>
        <animate attributeName="r" values="18;24;18" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* 로봇 본체 — 원형 */}
      <circle cx={0} cy={0} r={14} fill="#f5f5f5" stroke="#999" strokeWidth={1.5} />
      {/* 외곽 링 */}
      <circle cx={0} cy={0} r={12} fill="none" stroke="#ccc" strokeWidth={0.8} />
      {/* 라이다 범프 */}
      <circle cx={0} cy={-4} r={4.5} fill="#e0e0e0" stroke="#bbb" strokeWidth={0.6} />
      {/* 카메라 센서 */}
      <rect x={-2} y={-13} width={4} height={2.5} rx={1} fill="#333" />
      {/* 레드 LED */}
      <circle cx={0} cy={5} r={1.5} fill="#e53935" />
      {/* 라벨 */}
      <text x={0} y={26} textAnchor="middle" style={{ font: "600 8px var(--font-sans)", fill: "#555" }}>청소기</text>
    </g>
  );
}

// ── 점수 카운트업 ────────────────────────────────────────────

function useCountUp(target: number, duration = 400): number {
  const [val, setVal] = useState(target);
  const prevRef = useRef(target);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setVal(Math.round(from + (target - from) * eased));
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
    <tspan style={{ font: "700 14px var(--font-mono)" }}>{display}</tspan>
  );
}

// ── Aria ─────────────────────────────────────────────────────

function buildAriaLabel(rooms?: RoomScore[], userLocation?: RoomId | null): string {
  if (!rooms?.length) {
    return `아파트 평면도. ${ROOMS_SEED.map((r) => `${r.name_ko} ${r.base_score}점`).join(", ")}.`;
  }
  const parts = rooms.map((r) => {
    const m = r.mode === "excluded" ? " 제외" : r.mode === "quiet" ? " 저소음" : r.mode === "delayed" ? " 지연" : "";
    return `${ROOM_LABEL[r.room_id]} ${r.final}점${m}`;
  });
  return `아파트 평면도. ${parts.join(", ")}.${userLocation ? ` 사용자 ${ROOM_LABEL[userLocation]}.` : ""}`;
}

// ── 범례 ─────────────────────────────────────────────────────

const LEGEND_STEPS = [96, 90, 84, 78, 72, 66];

function HeatmapLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[11px] text-gray-500">
      <span className="font-medium text-text-muted">청소 우선순위</span>
      <div className="flex items-center gap-1.5">
        <span>낮음</span>
        <span className="flex" aria-hidden>
          {LEGEND_STEPS.map((l) => (
            <span key={l} className="block w-4 h-2.5 border-y border-l border-border-default last:border-r" style={{ background: `oklch(${l}% 0 0)` }} />
          ))}
        </span>
        <span>높음</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg width={16} height={10} aria-hidden className="border border-border-default">
          <defs><pattern id="hatch-legend" patternUnits="userSpaceOnUse" width="4" height="4"><path d="M0 4 L4 0" stroke="#9ca3af" strokeWidth="0.8" /></pattern></defs>
          <rect width={16} height={10} fill="url(#hatch-legend)" />
        </svg>
        <span>제외</span>
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────

export function HouseMap({ rooms, userLocation, onRoomClick }: Props) {
  const scoreMap = new Map(rooms?.map((r) => [r.room_id, r]) ?? []);
  const [hoveredRoom, setHoveredRoom] = useState<RoomId | null>(null);

  const topRoom = rooms?.filter((r) => r.mode !== "excluded").sort((a, b) => b.final - a.final)[0];
  const robotSeed = topRoom ? ROOMS_SEED.find((r) => r.id === topRoom.room_id) : null;

  return (
    <div>
      <svg
        viewBox="0 0 560 400"
        role="img"
        aria-label={buildAriaLabel(rooms, userLocation)}
        className="w-full h-auto rounded-xl border border-border-default shadow-[0_4px_24px_-12px_rgba(0,0,0,0.2)] overflow-hidden"
      >
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6">
            <path d="M0 6 L6 0" stroke="#9ca3af" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Layer 0: 도면 배경 이미지 */}
        <image
          href="/floorplan-bg.png"
          x={12} y={12}
          width={536} height={380}
          preserveAspectRatio="xMidYMid slice"
        />

        {/* Layer 1: 히트맵 오버레이 (반투명) */}
        {ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const mode = (s?.mode ?? "normal") as Mode;
          const isHovered = hoveredRoom === room.id;

          let fill: string;
          if (mode === "excluded") {
            fill = "url(#hatch)";
          } else {
            const t = Math.min(Math.max(score, 0), 80) / 80;
            const alpha = 0.1 + t * 0.35;
            fill = `rgba(30, 30, 30, ${alpha})`;
          }

          return (
            <rect
              key={room.id}
              x={room.bbox.x} y={room.bbox.y}
              width={room.bbox.w} height={room.bbox.h}
              fill={fill}
              stroke={isHovered ? "oklch(30% 0 0)" : "none"}
              strokeWidth={isHovered ? 2.5 : 0}
              style={{ transition: "fill 0.6s ease, stroke-width 0.2s ease", cursor: onRoomClick ? "pointer" : "default" }}
              onMouseEnter={() => setHoveredRoom(room.id)}
              onMouseLeave={() => setHoveredRoom(null)}
              onClick={() => onRoomClick?.(room.id)}
            />
          );
        })}

        {/* Layer 2: 벽 + 문 */}
        <Walls />

        {/* Layer 3: 라벨 + 점수 (배경 있는 태그) */}
        {ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const mode = (s?.mode ?? "normal") as Mode;
          const cx = room.bbox.x + room.bbox.w / 2;
          const cy = room.bbox.y + room.bbox.h / 2;
          const txtColor = scoreTextColor(score, mode);
          const bgColor = scoreBgColor(score, mode);

          return (
            <g key={`lbl-${room.id}`} style={{ pointerEvents: "none" }}>
              <rect
                x={cx - 32} y={cy - 16}
                width={64} height={34} rx={6}
                fill={bgColor}
              />
              <text x={cx} y={cy - 2} textAnchor="middle" style={{ font: "500 12px var(--font-sans)", fill: txtColor }}>
                {room.name_ko}
              </text>
              <text x={cx} y={cy + 14} textAnchor="middle" style={{ fill: txtColor }}>
                <AnimatedScore score={score} mode={mode} />
              </text>
            </g>
          );
        })}

        {/* Layer 4: 사용자 */}
        {userLocation && (() => {
          const room = ROOMS_SEED.find((r) => r.id === userLocation);
          if (!room) return null;
          return <PersonIcon x={room.bbox.x + room.bbox.w - 26} y={room.bbox.y + 28} />;
        })()}

        {/* Layer 5: 로봇 청소기 (SVG) */}
        {robotSeed && (
          <RobotIcon
            x={robotSeed.bbox.x + 28}
            y={robotSeed.bbox.y + robotSeed.bbox.h - 28}
          />
        )}
      </svg>
      <HeatmapLegend />
    </div>
  );
}
