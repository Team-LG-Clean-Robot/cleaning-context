"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/* ── 문 위치 & 방 인접 그래프 ── */
const DOORS: Record<string, Pt> = {
  "living|kitchen":   { x: 197, y: 148 },
  "living|entrance":  { x: 262, y: 228 },
  "kitchen|entrance": { x: 262, y: 176 },
  "kitchen|bedroom":  { x: 362, y: 120 },
  "entrance|bathroom":{ x: 355, y: 280 },
};

const ADJACENCY: Record<string, RoomId[]> = {
  living:   ["kitchen", "entrance"],
  kitchen:  ["living", "entrance", "bedroom"],
  entrance: ["living", "kitchen", "bathroom"],
  bedroom:  ["kitchen"],
  bathroom: ["entrance"],
};

function doorKey(a: string, b: string): string { return [a, b].sort().join("|"); }
function getDoor(a: string, b: string): Pt { return DOORS[doorKey(a, b)] ?? { x: 300, y: 200 }; }
function dist(a: Pt, b: Pt): number { return Math.hypot(a.x - b.x, a.y - b.y); }

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

/* 수평→수직 L자 경로 (대각선 이동 방지) */
function hvSteps(from: Pt, to: Pt): Pt[] {
  if (Math.abs(from.x - to.x) < 2) return [to];
  if (Math.abs(from.y - to.y) < 2) return [to];
  return [{ x: to.x, y: from.y }, to];
}

function buildTravelPath(roomSeq: RoomId[], startPt: Pt): Pt[] {
  const pts: Pt[] = [];
  let prev = startPt;
  for (let i = 0; i < roomSeq.length - 1; i++) {
    const door = getDoor(roomSeq[i], roomSeq[i + 1]);
    pts.push(...hvSteps(prev, door));
    prev = door;
  }
  return pts;
}

/* ── 방 내부 청소 패턴 (지그재그 + 원형 회전) ── */
const ORBIT_R = 12;
const ORBIT_PTS = 6;
function orbitAround(center: Pt): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= ORBIT_PTS; i++) {
    const a = (2 * Math.PI * i) / ORBIT_PTS;
    pts.push({ x: center.x + Math.cos(a) * ORBIT_R, y: center.y + Math.sin(a) * ORBIT_R });
  }
  return pts;
}

const CLEAN_ANCHORS: Record<string, Pt[]> = {
  kitchen:  [{ x: 240, y: 75 }, { x: 320, y: 75 }, { x: 320, y: 145 }, { x: 240, y: 145 }],
  bedroom:  [{ x: 400, y: 80 }, { x: 478, y: 80 }, { x: 478, y: 195 }, { x: 400, y: 195 }],
  living:   [{ x: 125, y: 160 }, { x: 225, y: 160 }, { x: 225, y: 305 }, { x: 125, y: 305 }],
  entrance: [{ x: 285, y: 225 }, { x: 335, y: 225 }, { x: 335, y: 315 }, { x: 285, y: 315 }],
  bathroom: [{ x: 380, y: 262 }, { x: 465, y: 262 }, { x: 465, y: 325 }, { x: 380, y: 325 }],
};

function buildCleanPath(room: RoomId): Pt[] {
  const anchors = CLEAN_ANCHORS[room];
  if (!anchors?.length) return [];
  const pts: Pt[] = [];
  for (const a of anchors) {
    pts.push(a);
    pts.push(...orbitAround(a));
  }
  return pts;
}

/* ── 속도 ── */
const ROBOT_SPEED = 60;
const MIN_MS = 400;
function msFor(a: Pt, b: Pt): number { return Math.max(MIN_MS, (dist(a, b) / ROBOT_SPEED) * 1000); }

/* ── 먼지 파티클 ── */
type Dust = { id: string; x: number; y: number; roomId: RoomId };

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function generateDust(roomScores: RoomScore[]): Dust[] {
  const particles: Dust[] = [];
  for (const rs of roomScores) {
    if (rs.mode === "excluded") continue;
    const seed = ROOMS_SEED.find((r) => r.id === rs.room_id);
    if (!seed) continue;
    const count = Math.min(Math.ceil(rs.final / 6), 12);
    const rng = seededRandom(rs.room_id.charCodeAt(0) * 1000 + rs.final);
    const anchors = CLEAN_ANCHORS[rs.room_id];
    if (!anchors?.length) continue;
    const minX = Math.min(...anchors.map((a) => a.x)) - 5;
    const maxX = Math.max(...anchors.map((a) => a.x)) + 5;
    const minY = Math.min(...anchors.map((a) => a.y)) - 5;
    const maxY = Math.max(...anchors.map((a) => a.y)) + 5;
    for (let i = 0; i < count; i++) {
      particles.push({
        id: `${rs.room_id}-${i}`,
        x: minX + rng() * (maxX - minX),
        y: minY + rng() * (maxY - minY),
        roomId: rs.room_id,
      });
    }
  }
  return particles;
}

/* ── 로봇 이동 훅: 방별 순차 청소 ── */
type RobotState = { pos: Pt; durationMs: number; cleaning: boolean; cleaningRoom: RoomId | null };

function useRobotMotion(roomScores: RoomScore[] | null): RobotState {
  const IDLE_PT: Pt = { x: 170, y: 265 };
  const [pos, setPos] = useState<Pt>(IDLE_PT);
  const [durationMs, setDurationMs] = useState(0);
  const [cleaning, setCleaning] = useState(false);
  const [cleaningRoom, setCleaningRoom] = useState<RoomId | null>(null);
  const currentRoom = useRef<RoomId>("living");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const sortedRooms = useMemo(() => {
    if (!roomScores) return [];
    return roomScores
      .filter((r) => r.mode !== "excluded" && r.final > 0)
      .sort((a, b) => b.final - a.final);
  }, [roomScores]);

  useEffect(() => {
    clearTimers();
    setCleaning(false);
    setCleaningRoom(null);

    if (!sortedRooms.length) {
      setPos(IDLE_PT);
      setDurationMs(0);
      currentRoom.current = "living";
      return;
    }

    let cancelled = false;
    let roomIdx = 0;

    function scheduleRoom() {
      if (cancelled) return;
      const target = sortedRooms[roomIdx % sortedRooms.length];
      roomIdx++;
      const from = currentRoom.current;
      const roomSeq = bfsPath(from, target.room_id);
      const travelPts = buildTravelPath(roomSeq, pos);
      const cleanPts = buildCleanPath(target.room_id);

      let prev = pos;
      let delay = 0;

      // travel phase
      setCleaning(false);
      setCleaningRoom(null);

      for (const wp of travelPts) {
        const ms = msFor(prev, wp);
        const w = wp;
        timers.current.push(setTimeout(() => {
          if (cancelled) return;
          setDurationMs(ms);
          setPos(w);
        }, delay));
        delay += ms + 40;
        prev = wp;
      }

      // cleaning phase
      const cleanStart = delay;
      timers.current.push(setTimeout(() => {
        if (cancelled) return;
        currentRoom.current = target.room_id;
        setCleaning(true);
        setCleaningRoom(target.room_id);
      }, cleanStart));

      for (const cp of cleanPts) {
        const ms = msFor(prev, cp);
        const c = cp;
        timers.current.push(setTimeout(() => {
          if (cancelled) return;
          setDurationMs(ms);
          setPos(c);
        }, delay));
        delay += ms + 30;
        prev = cp;
      }

      // move to next room
      timers.current.push(setTimeout(() => {
        if (cancelled) return;
        setCleaning(false);
        setCleaningRoom(null);
        scheduleRoom();
      }, delay + 300));
    }

    // small initial delay to let first render settle
    timers.current.push(setTimeout(scheduleRoom, 200));

    return () => {
      cancelled = true;
      clearTimers();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedRooms]);

  return { pos, durationMs, cleaning, cleaningRoom };
}

/* ── 먼지 제거 훅 ── */
function useDustState(
  roomScores: RoomScore[] | null,
  cleaningRoom: RoomId | null,
): Set<string> {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const dustRef = useRef<Dust[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const dust = useMemo(() => (roomScores ? generateDust(roomScores) : []), [roomScores]);
  dustRef.current = dust;

  // reset when scenario changes
  useEffect(() => { setHidden(new Set()); }, [roomScores]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!cleaningRoom) return;

    const roomDust = dustRef.current
      .filter((d) => d.roomId === cleaningRoom)
      .map((d) => d.id);
    let idx = 0;

    intervalRef.current = setInterval(() => {
      if (idx >= roomDust.length) {
        clearInterval(intervalRef.current);
        return;
      }
      setHidden((prev) => {
        const next = new Set(prev);
        next.add(roomDust[idx]);
        return next;
      });
      idx++;
    }, 800);

    return () => clearInterval(intervalRef.current);
  }, [cleaningRoom]);

  return hidden;
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

function RobotIcon({ x, y, durationMs = 0, cleaning = false }: { x: number; y: number; durationMs?: number; cleaning?: boolean }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)`, transition: durationMs > 0 ? `transform ${durationMs}ms linear` : "none" }}>
      <g style={cleaning ? { animation: "robot-orbit 1.8s linear infinite" } : undefined}>
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
  room, fill, stroke, strokeWidth, style, onMouseEnter, onMouseLeave, onClick,
}: {
  room: RoomBbox; fill: string; stroke: string; strokeWidth: number;
  style: React.CSSProperties; onMouseEnter: () => void; onMouseLeave: () => void; onClick: () => void;
}) {
  if (room.polygon) {
    return (
      <polygon points={room.polygon} fill={fill} stroke={stroke} strokeWidth={strokeWidth}
        strokeLinejoin="round" style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick} />
    );
  }
  return (
    <rect x={room.bbox.x} y={room.bbox.y} width={room.bbox.w} height={room.bbox.h}
      fill={fill} stroke={stroke} strokeWidth={strokeWidth} rx={1}
      style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick} />
  );
}

/* ── 메인 컴포넌트 ── */
export function HouseMap({ rooms, userLocation, onRoomClick }: Props) {
  const scoreMap = new Map(rooms?.map((r) => [r.room_id, r]) ?? []);
  const [hoveredRoom, setHoveredRoom] = useState<RoomId | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const hasScenario = rooms && rooms.length > 0;
  const { pos: robotPos, durationMs, cleaning, cleaningRoom } = useRobotMotion(hasScenario ? rooms! : null);

  const dust = useMemo(() => (hasScenario ? generateDust(rooms!) : []), [rooms, hasScenario]);
  const hiddenDust = useDustState(hasScenario ? rooms! : null, cleaningRoom);

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
        <style>{`
          @keyframes robot-orbit {
            0%   { transform: translate(0, 0); }
            25%  { transform: translate(6px, 4px); }
            50%  { transform: translate(0, 8px); }
            75%  { transform: translate(-6px, 4px); }
            100% { transform: translate(0, 0); }
          }
          @keyframes dust-fade {
            from { opacity: 0.5; }
            to   { opacity: 0; transform: scale(0); }
          }
        `}</style>

        <image href="/floorplan-bg.png" x={0} y={0} width={600} height={400} preserveAspectRatio="xMidYMid slice" />

        {ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const mode = (s?.mode ?? "normal") as Mode;
          const isHovered = hoveredRoom === room.id;

          let fill: string;
          if (!showOverlay) fill = "transparent";
          else if (mode === "excluded") fill = "url(#hatch)";
          else { const t = Math.min(Math.max(score, 0), 80) / 80; fill = `rgba(20, 50, 100, ${0.08 + t * 0.3})`; }

          return (
            <RoomShape key={room.id} room={room} fill={fill}
              stroke={showOverlay && isHovered ? "oklch(40% 0.15 250)" : "transparent"}
              strokeWidth={isHovered && showOverlay ? 2.5 : 0}
              style={{ transition: "fill 0.6s ease, stroke 0.2s ease", cursor: onRoomClick ? "pointer" : "default" }}
              onMouseEnter={() => setHoveredRoom(room.id)} onMouseLeave={() => setHoveredRoom(null)}
              onClick={() => onRoomClick?.(room.id)} />
          );
        })}

        {/* 먼지 파티클 */}
        {showOverlay && dust.map((d) => {
          const isHidden = hiddenDust.has(d.id);
          return (
            <circle key={d.id} cx={d.x} cy={d.y} r={3} fill="rgba(140,120,100,0.5)" style={{
              transition: "opacity 0.6s ease, transform 0.6s ease",
              opacity: isHidden ? 0 : 0.5,
              transform: isHidden ? "scale(0)" : "scale(1)",
              transformOrigin: `${d.x}px ${d.y}px`,
              pointerEvents: "none",
            }} />
          );
        })}

        {/* 라벨 + 점수 */}
        {showOverlay && ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const c = roomCenter(room);
          return (
            <g key={`lbl-${room.id}`} style={{ pointerEvents: "none" }}>
              <rect x={c.x - 28} y={c.y - 14} width={56} height={30} rx={5} fill="rgba(255,255,255,0.75)" stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
              <text x={c.x} y={c.y - 1} textAnchor="middle" style={{ font: "500 11px var(--font-sans)", fill: "#333" }}>{room.name_ko}</text>
              <text x={c.x} y={c.y + 13} textAnchor="middle" style={{ font: "700 13px var(--font-mono)", fill: "#111" }}>
                {rooms ? <AnimatedScoreText score={score} /> : score}
              </text>
            </g>
          );
        })}

        {userLocation && (() => {
          const room = ROOMS_SEED.find((r) => r.id === userLocation);
          if (!room) return null;
          const c = roomCenter(room);
          return <PersonIcon x={c.x + 30} y={c.y - 20} />;
        })()}

        <RobotIcon x={robotPos.x} y={robotPos.y} durationMs={durationMs} cleaning={cleaning} />
      </svg>

      <button type="button" onClick={() => setShowOverlay((v) => !v)}
        className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-border-default px-2.5 py-1.5 text-[11px] font-medium text-gray-600 shadow-sm hover:bg-white/95 transition-colors">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {showOverlay ? (
            <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx={12} cy={12} r={3} /></>
          ) : (
            <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1={1} y1={1} x2={23} y2={23} /></>
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
