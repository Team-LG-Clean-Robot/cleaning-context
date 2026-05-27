"use client";
import { useEffect, useRef, useState } from "react";
import { ROOMS_SEED, ROOM_LABEL, type Mode, type RoomBbox, type RoomId, type RoomScore } from "@/lib/types";

type Props = {
  rooms?: RoomScore[];
  userLocation?: RoomId | null;
  onRoomClick?: (roomId: RoomId) => void;
};

function roomCenter(room: RoomBbox): { x: number; y: number } {
  if (room.center) return room.center;
  return { x: room.bbox.x + room.bbox.w / 2, y: room.bbox.y + room.bbox.h / 2 };
}

const ROBOT_OFFSET: Record<string, { dx: number; dy: number }> = {
  kitchen:  { dx:  50, dy:  35 },
  bedroom:  { dx:  40, dy:  60 },
  living:   { dx: -50, dy: -40 },
  entrance: { dx:  20, dy:  45 },
  bathroom: { dx:  35, dy: -25 },
};

function robotOffset(room: RoomBbox): { x: number; y: number } {
  const c = roomCenter(room);
  const off = ROBOT_OFFSET[room.id] ?? { dx: 0, dy: 25 };
  return { x: c.x + off.dx, y: c.y + off.dy };
}

const PATROL_ORDER: RoomId[] = ["living", "kitchen", "bedroom", "bathroom", "entrance"];
const PATROL_INTERVAL = 3000;

function usePatrol(active: boolean): { x: number; y: number } {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!active) {
      clearInterval(timerRef.current);
      return;
    }
    setIdx(0);
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % PATROL_ORDER.length);
    }, PATROL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [active]);

  const room = ROOMS_SEED.find((r) => r.id === PATROL_ORDER[idx]);
  if (!room) return { x: -100, y: -100 };
  return robotOffset(room);
}

function PersonIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: "none" }}>
      <circle cx={0} cy={0} r={13} fill="white" stroke="#1a1a1a" strokeWidth={1.2} />
      <circle cx={0} cy={-5} r={3.5} fill="#1a1a1a" />
      <path d="M -5 1 q 5 -3 10 0 v 5 q -5 3 -10 0 z" fill="#1a1a1a" />
      <text x={0} y={24} textAnchor="middle" style={{ font: "600 9px var(--font-sans)", fill: "#1a1a1a" }}>사용자</text>
    </g>
  );
}

function RobotIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="transition-all duration-[1200ms] ease-in-out" style={{ transform: `translate(${x}px, ${y}px)` }}>
      <circle cx={0} cy={0} r={18} fill="none" stroke="oklch(50% 0.12 250)" strokeWidth={1.2} opacity={0.3}>
        <animate attributeName="r" values="18;25;18" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <ellipse cx={1} cy={2} rx={13} ry={12} fill="rgba(0,0,0,0.08)" />
      <circle cx={0} cy={0} r={13} fill="#f8f8f8" stroke="#bbb" strokeWidth={1.2} />
      <circle cx={0} cy={0} r={11} fill="none" stroke="#ddd" strokeWidth={0.6} />
      <circle cx={0} cy={-3} r={4} fill="#eee" stroke="#ccc" strokeWidth={0.6} />
      <rect x={-2.5} y={-12.5} width={5} height={2.5} rx={1} fill="#444" />
      <circle cx={0} cy={5} r={1.5} fill="#e53935">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <text x={0} y={24} textAnchor="middle" style={{ font: "600 8px var(--font-sans)", fill: "#666" }}>청소기</text>
    </g>
  );
}

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
      setVal(Math.round(from + (target - from) * (1 - (1 - t) * (1 - t))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function buildAriaLabel(rooms?: RoomScore[], userLocation?: RoomId | null): string {
  if (!rooms?.length) {
    return `아파트 평면도. ${ROOMS_SEED.map((r) => `${r.name_ko} ${r.base_score}점`).join(", ")}.`;
  }
  const parts = rooms.map((r) => {
    const m = r.mode === "excluded" ? " 제외" : r.mode === "quiet" ? " 저소음" : "";
    return `${ROOM_LABEL[r.room_id]} ${r.final}점${m}`;
  });
  return `아파트 평면도. ${parts.join(", ")}.${userLocation ? ` 사용자 ${ROOM_LABEL[userLocation]}.` : ""}`;
}

const LEGEND_STEPS = [96, 90, 84, 78, 72, 66];

function HeatmapLegend({ visible }: { visible: boolean }) {
  if (!visible) return null;
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
          <defs><pattern id="hl" patternUnits="userSpaceOnUse" width="4" height="4"><path d="M0 4 L4 0" stroke="#9ca3af" strokeWidth="0.8" /></pattern></defs>
          <rect width={16} height={10} fill="url(#hl)" />
        </svg>
        <span>제외</span>
      </div>
    </div>
  );
}

function RoomShape({
  room,
  fill,
  stroke,
  strokeWidth,
  style,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  room: RoomBbox;
  fill: string;
  stroke: string;
  strokeWidth: number;
  style: React.CSSProperties;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  if (room.polygon) {
    return (
      <polygon
        points={room.polygon}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        style={style}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      />
    );
  }
  return (
    <rect
      x={room.bbox.x}
      y={room.bbox.y}
      width={room.bbox.w}
      height={room.bbox.h}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      rx={1}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  );
}

export function HouseMap({ rooms, userLocation, onRoomClick }: Props) {
  const scoreMap = new Map(rooms?.map((r) => [r.room_id, r]) ?? []);
  const [hoveredRoom, setHoveredRoom] = useState<RoomId | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const hasScenario = rooms && rooms.length > 0;
  const topRoom = rooms?.filter((r) => r.mode !== "excluded").sort((a, b) => b.final - a.final)[0];
  const robotSeed = topRoom ? ROOMS_SEED.find((r) => r.id === topRoom.room_id) : null;
  const scenarioPos = robotSeed ? robotOffset(robotSeed) : null;
  const patrolPos = usePatrol(!hasScenario);
  const robotX = hasScenario && scenarioPos ? scenarioPos.x : patrolPos.x;
  const robotY = hasScenario && scenarioPos ? scenarioPos.y : patrolPos.y;

  return (
    <div className="relative">
      <svg
        viewBox="0 0 600 400"
        role="img"
        aria-label={buildAriaLabel(rooms, userLocation)}
        className="w-full h-auto rounded-xl border border-border-default shadow-[0_4px_24px_-12px_rgba(0,0,0,0.2)] overflow-hidden"
      >
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6">
            <path d="M0 6 L6 0" stroke="rgba(120,120,120,0.5)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* 도면 이미지 배경 */}
        <image href="/floorplan-bg.png" x={0} y={0} width={600} height={400} preserveAspectRatio="xMidYMid slice" />

        {/* 히트맵 오버레이 (클릭 영역은 항상, 색상은 토글) */}
        {ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const mode = (s?.mode ?? "normal") as Mode;
          const isHovered = hoveredRoom === room.id;

          let fill: string;
          if (!showOverlay) {
            fill = "transparent";
          } else if (mode === "excluded") {
            fill = "url(#hatch)";
          } else {
            const t = Math.min(Math.max(score, 0), 80) / 80;
            fill = `rgba(20, 50, 100, ${0.08 + t * 0.3})`;
          }

          return (
            <RoomShape
              key={room.id}
              room={room}
              fill={fill}
              stroke={showOverlay && isHovered ? "oklch(40% 0.15 250)" : "transparent"}
              strokeWidth={isHovered && showOverlay ? 2.5 : 0}
              style={{ transition: "fill 0.6s ease, stroke 0.2s ease", cursor: onRoomClick ? "pointer" : "default" }}
              onMouseEnter={() => setHoveredRoom(room.id)}
              onMouseLeave={() => setHoveredRoom(null)}
              onClick={() => onRoomClick?.(room.id)}
            />
          );
        })}

        {/* 라벨 + 점수 (토글) */}
        {showOverlay && ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const c = roomCenter(room);

          return (
            <g key={`lbl-${room.id}`} style={{ pointerEvents: "none" }}>
              <rect x={c.x - 28} y={c.y - 14} width={56} height={30} rx={5} fill="rgba(255,255,255,0.75)" stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
              <text x={c.x} y={c.y - 1} textAnchor="middle" style={{ font: "500 11px var(--font-sans)", fill: "#333" }}>
                {room.name_ko}
              </text>
              <text x={c.x} y={c.y + 13} textAnchor="middle" style={{ font: "700 13px var(--font-mono)", fill: "#111" }}>
                {rooms ? <AnimatedScoreText score={score} /> : score}
              </text>
            </g>
          );
        })}

        {/* 사용자 */}
        {userLocation && (() => {
          const room = ROOMS_SEED.find((r) => r.id === userLocation);
          if (!room) return null;
          const c = roomCenter(room);
          return <PersonIcon x={c.x + 30} y={c.y - 20} />;
        })()}

        {/* 로봇 청소기 (항상 표시) */}
        <RobotIcon x={robotX} y={robotY} />
      </svg>

      {/* 히트맵 토글 버튼 */}
      <button
        type="button"
        onClick={() => setShowOverlay((v) => !v)}
        className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-border-default px-2.5 py-1.5 text-[11px] font-medium text-gray-600 shadow-sm hover:bg-white/95 transition-colors"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {showOverlay ? (
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx={12} cy={12} r={3} />
            </>
          ) : (
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1={1} y1={1} x2={23} y2={23} />
            </>
          )}
        </svg>
        {showOverlay ? "히트맵 숨기기" : "히트맵 보기"}
      </button>

      <HeatmapLegend visible={showOverlay} />
    </div>
  );
}

function AnimatedScoreText({ score }: { score: number }) {
  const display = useCountUp(score);
  return <>{display}</>;
}
