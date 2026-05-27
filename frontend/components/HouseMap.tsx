"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ROOMS_SEED, ROOM_LABEL, type Mode, type RoomBbox, type RoomId, type RoomScore } from "@/lib/types";

type Props = {
  rooms?: RoomScore[];
  userLocation?: RoomId | null;
  onRoomClick?: (roomId: RoomId) => void;
};
type Pt = { x: number; y: number };

function roomCenter(room: RoomBbox): Pt {
  if (room.center) return room.center;
  return { x: room.bbox.x + room.bbox.w / 2, y: room.bbox.y + room.bbox.h / 2 };
}

/* ── 문 위치 & 방 인접 그래프 (도면 좌표 기준) ── */
const DOORS: Record<string, Pt> = {
  "living|kitchen":   { x: 197, y: 148 },
  "living|entrance":  { x: 262, y: 215 },
  "kitchen|entrance": { x: 250, y: 176 },
  "kitchen|bedroom":  { x: 362, y: 120 },
  "entrance|bathroom":{ x: 355, y: 278 },
};

const ADJACENCY: Record<string, RoomId[]> = {
  living:   ["kitchen", "entrance"],
  kitchen:  ["living", "entrance", "bedroom"],
  entrance: ["living", "kitchen", "bathroom"],
  bedroom:  ["kitchen"],
  bathroom: ["entrance"],
};

function doorKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

function getDoor(a: string, b: string): Pt {
  return DOORS[doorKey(a, b)] ?? { x: 300, y: 200 };
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/* BFS 최단 경로 (방 ID 시퀀스) */
function bfsPath(from: RoomId, to: RoomId): RoomId[] {
  if (from === to) return [from];
  const visited = new Set<string>([from]);
  const queue: RoomId[][] = [[from]];
  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    for (const nb of ADJACENCY[last] ?? []) {
      if (visited.has(nb)) continue;
      const next = [...path, nb];
      if (nb === to) return next;
      visited.add(nb);
      queue.push(next);
    }
  }
  return [from, to];
}

/* 방 시퀀스 → 문 경유 좌표 waypoints */
function buildWaypoints(roomPath: RoomId[]): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < roomPath.length - 1; i++) {
    pts.push(getDoor(roomPath[i], roomPath[i + 1]));
  }
  return pts;
}

/* ── 방 내부 청소 패턴 (지그재그) ── */
const CLEAN_PATHS: Record<string, Pt[]> = {
  kitchen:  [{ x: 220, y: 65 }, { x: 335, y: 65 }, { x: 335, y: 150 }, { x: 220, y: 150 }, { x: 220, y: 108 }, { x: 335, y: 108 }],
  bedroom:  [{ x: 390, y: 70 }, { x: 488, y: 70 }, { x: 488, y: 200 }, { x: 390, y: 200 }, { x: 390, y: 135 }, { x: 488, y: 135 }],
  living:   [{ x: 115, y: 145 }, { x: 230, y: 145 }, { x: 230, y: 310 }, { x: 115, y: 310 }, { x: 115, y: 228 }, { x: 230, y: 228 }],
  entrance: [{ x: 280, y: 200 }, { x: 340, y: 200 }, { x: 340, y: 320 }, { x: 280, y: 320 }, { x: 280, y: 260 }, { x: 340, y: 260 }],
  bathroom: [{ x: 375, y: 262 }, { x: 470, y: 262 }, { x: 470, y: 328 }, { x: 375, y: 328 }, { x: 375, y: 295 }, { x: 470, y: 295 }],
};

const ROBOT_SPEED = 120; // SVG units per second
const MIN_MS = 300;

function msForSegment(a: Pt, b: Pt): number {
  return Math.max(MIN_MS, (dist(a, b) / ROBOT_SPEED) * 1000);
}

/* ── 로봇 이동 훅: 경로 탐색 + 문 통과 + 청소 패턴 ── */
function useRobotMotion(targetRoom: RoomId | null): { pos: Pt; durationMs: number } {
  const startPt: Pt = { x: 170, y: 265 };
  const [pos, setPos] = useState<Pt>(startPt);
  const [durationMs, setDurationMs] = useState(0);
  const currentRoom = useRef<RoomId>("living");
  const phase = useRef<"idle" | "traveling" | "cleaning">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const moveTo = useCallback((pt: Pt, ms: number) => {
    setDurationMs(ms);
    setPos(pt);
  }, []);

  const startCleaning = useCallback((room: RoomId) => {
    phase.current = "cleaning";
    const path = CLEAN_PATHS[room] ?? [];
    if (!path.length) return;
    let i = 0;
    const step = () => {
      if (phase.current !== "cleaning") return;
      const target = path[i % path.length];
      const prev = i === 0 ? pos : path[(i - 1) % path.length];
      const ms = msForSegment(prev, target);
      moveTo(target, ms);
      i++;
      timers.current.push(setTimeout(step, ms + 50));
    };
    step();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveTo]);

  /* patrol 모드 (시나리오 없을 때) */
  const startPatrol = useCallback(() => {
    const order: RoomId[] = ["living", "kitchen", "bedroom", "bathroom", "entrance"];
    let idx = 0;

    const goNext = () => {
      const from = currentRoom.current;
      const to = order[idx % order.length];
      idx++;
      const roomSeq = bfsPath(from, to);
      const waypoints = buildWaypoints(roomSeq);
      const cleanPts = CLEAN_PATHS[to] ?? [];
      const allPts = [...waypoints, ...(cleanPts.length ? [cleanPts[0]] : [])];

      phase.current = "traveling";
      let prev = pos;
      let delay = 0;

      for (const wp of allPts) {
        const ms = msForSegment(prev, wp);
        const p = prev;
        timers.current.push(setTimeout(() => {
          if (phase.current !== "traveling" && phase.current !== "cleaning") return;
          moveTo(wp, ms);
        }, delay));
        delay += ms + 60;
        prev = wp;
      }

      timers.current.push(setTimeout(() => {
        currentRoom.current = to;
        phase.current = "cleaning";
        const path = CLEAN_PATHS[to] ?? [];
        if (!path.length) { timers.current.push(setTimeout(goNext, 1000)); return; }
        let ci = 1;
        const cleanStep = () => {
          if (phase.current !== "cleaning") return;
          const target = path[ci % path.length];
          const pr = path[(ci - 1) % path.length];
          const ms2 = msForSegment(pr, target);
          moveTo(target, ms2);
          ci++;
          if (ci <= path.length + 1) {
            timers.current.push(setTimeout(cleanStep, ms2 + 50));
          } else {
            timers.current.push(setTimeout(goNext, 400));
          }
        };
        cleanStep();
      }, delay));
    };

    goNext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveTo]);

  useEffect(() => {
    if (!targetRoom) {
      clearTimers();
      phase.current = "idle";
      startPatrol();
      return () => clearTimers();
    }

    clearTimers();
    const from = currentRoom.current;
    if (from === targetRoom) {
      startCleaning(targetRoom);
      return () => clearTimers();
    }

    const roomSeq = bfsPath(from, targetRoom);
    const waypoints = buildWaypoints(roomSeq);
    const cleanStart = CLEAN_PATHS[targetRoom]?.[0];
    if (cleanStart) waypoints.push(cleanStart);

    phase.current = "traveling";
    let prev = pos;
    let delay = 0;

    for (const wp of waypoints) {
      const ms = msForSegment(prev, wp);
      timers.current.push(setTimeout(() => moveTo(wp, ms), delay));
      delay += ms + 60;
      prev = wp;
    }

    timers.current.push(setTimeout(() => {
      currentRoom.current = targetRoom;
      startCleaning(targetRoom);
    }, delay));

    return () => clearTimers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRoom]);

  return { pos, durationMs };
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

function RobotIcon({ x, y, durationMs = 1200 }: { x: number; y: number; durationMs?: number }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)`, transition: `transform ${durationMs}ms linear` }}>
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

  const topRoom = rooms?.filter((r) => r.mode !== "excluded").sort((a, b) => b.final - a.final)[0];
  const targetRoom = topRoom?.room_id ?? null;
  const { pos: robotPos, durationMs } = useRobotMotion(targetRoom);

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
        <RobotIcon x={robotPos.x} y={robotPos.y} durationMs={durationMs} />
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
