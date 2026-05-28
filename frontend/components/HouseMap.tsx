"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ROOMS_SEED, ROOM_LABEL, type Mode, type RoomBbox, type RoomId, type RoomScore } from "@/lib/types";

type Props = {
  rooms?: RoomScore[];
  userLocation?: RoomId | null;
  onRoomClick?: (room: RoomScore) => void;
  paused?: boolean;
  currentTime?: string | null;
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

function hvSteps(from: Pt, to: Pt): Pt[] {
  if (Math.abs(from.x - to.x) < 2 || Math.abs(from.y - to.y) < 2) return [to];
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

/* ── 청소 패턴 ── */
const CLEAN_ANCHORS: Record<string, Pt[]> = {
  kitchen:  [{ x: 240, y: 75 }, { x: 320, y: 75 }, { x: 320, y: 145 }, { x: 240, y: 145 }],
  bedroom:  [{ x: 400, y: 80 }, { x: 478, y: 80 }, { x: 478, y: 195 }, { x: 400, y: 195 }],
  living:   [{ x: 125, y: 160 }, { x: 225, y: 160 }, { x: 225, y: 305 }, { x: 125, y: 305 }],
  entrance: [{ x: 285, y: 225 }, { x: 335, y: 225 }, { x: 335, y: 315 }, { x: 285, y: 315 }],
  bathroom: [{ x: 380, y: 262 }, { x: 465, y: 262 }, { x: 465, y: 325 }, { x: 380, y: 325 }],
};

/** 청소 경로 — 방 안의 먼지 좌표를 순서대로 방문. 먼지가 없으면 anchor 코너 순회. */
function buildCleanPath(room: RoomId, allDust: Dust[], hidden: Set<string>): Pt[] {
  const roomDust = allDust.filter((d) => d.roomId === room && !hidden.has(d.id));
  if (roomDust.length > 0) {
    return roomDust.map((d) => ({ x: d.x, y: d.y }));
  }
  return CLEAN_ANCHORS[room] ?? [];
}

const ROBOT_SPEED = 60;
const MIN_MS = 400;
function msFor(a: Pt, b: Pt): number { return Math.max(MIN_MS, (dist(a, b) / ROBOT_SPEED) * 1000); }

/* ── 먼지 파티클 ── */
type Dust = { id: string; x: number; y: number; roomId: RoomId };

function seededRng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

const MAX_DUST_PER_ROOM = 6;

function generateDustPool(roomIds: RoomId[]): Dust[] {
  const particles: Dust[] = [];
  for (const rid of roomIds) {
    const anchors = CLEAN_ANCHORS[rid];
    if (!anchors?.length) continue;
    const rng = seededRng(rid.charCodeAt(0) * 1000 + rid.charCodeAt(1) * 31);
    const minX = Math.min(...anchors.map((a) => a.x)) - 8;
    const maxX = Math.max(...anchors.map((a) => a.x)) + 8;
    const minY = Math.min(...anchors.map((a) => a.y)) - 8;
    const maxY = Math.max(...anchors.map((a) => a.y)) + 8;
    for (let i = 0; i < MAX_DUST_PER_ROOM; i++) {
      particles.push({
        id: `${rid}-${i}`,
        x: minX + rng() * (maxX - minX),
        y: minY + rng() * (maxY - minY),
        roomId: rid,
      });
    }
  }
  return particles;
}

function activeDustIds(pool: Dust[], roomScores: RoomScore[]): Set<string> {
  const ranked = roomScores
    .filter((r) => r.mode !== "excluded" && r.final > 0)
    .sort((a, b) => b.final - a.final);
  const active = new Set<string>();
  for (let rank = 0; rank < ranked.length; rank++) {
    const count = Math.max(1, MAX_DUST_PER_ROOM - rank);
    for (let i = 0; i < count; i++) active.add(`${ranked[rank].room_id}-${i}`);
  }
  return active;
}

/* ── 로봇 이동 훅 ── */
type RobotOut = { pos: Pt; durationMs: number; cleaning: boolean; cleaningRoom: RoomId | null };

function pickNextRoom(
  roomScores: RoomScore[],
  dust: Dust[],
  hidden: Set<string>,
): RoomId | null {
  let best: { id: RoomId; score: number } | null = null;
  for (const r of roomScores) {
    if (r.mode === "excluded") continue;
    const total = dust.filter((d) => d.roomId === r.room_id).length;
    const removed = dust.filter((d) => d.roomId === r.room_id && hidden.has(d.id)).length;
    if (total > 0 && removed >= total) continue;
    const effective = total > 0 ? Math.round(r.final * (1 - removed / total)) : r.final;
    if (effective <= 0) continue;
    if (!best || effective > best.score) best = { id: r.room_id, score: effective };
  }
  return best?.id ?? null;
}

function useRobotMotion(
  roomScores: RoomScore[] | null,
  allDust: Dust[],
  hiddenDust: Set<string>,
  paused: boolean,
): RobotOut {
  const IDLE: Pt = { x: 309, y: 220 };
  const [pos, setPos] = useState<Pt>(IDLE);
  const [durationMs, setDurationMs] = useState(0);
  const [cleaning, setCleaning] = useState(false);
  const [cleaningRoom, setCleaningRoom] = useState<RoomId | null>(null);
  const currentRoom = useRef<RoomId>("entrance");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancelledRef = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  // refs so scheduleRoom can read latest values
  const roomScoresRef = useRef(roomScores);
  roomScoresRef.current = roomScores;
  const dustRef = useRef(allDust);
  dustRef.current = allDust;
  const hiddenRef = useRef(hiddenDust);
  hiddenRef.current = hiddenDust;
  // posRef tracks latest robot position so recursive scheduleRoom uses actual current pos, not closure capture
  const posRef = useRef(pos);
  posRef.current = pos;
  // track which room is being cleaned to avoid re-triggering
  const activeTarget = useRef<RoomId | null>(null);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    cancelledRef.current = true;
  }, []);

  const hasRooms = roomScores && roomScores.some((r) => r.mode !== "excluded" && r.final > 0);

  // Main scheduling effect — triggered by scenario change
  useEffect(() => {
    clearTimers();
    cancelledRef.current = false;
    setCleaning(false);
    setCleaningRoom(null);
    activeTarget.current = null;

    if (!hasRooms || !roomScores) {
      setPos(IDLE);
      setDurationMs(0);
      currentRoom.current = "entrance";
      return;
    }

    function scheduleRoom() {
      if (cancelledRef.current) return;
      const next = pickNextRoom(roomScoresRef.current!, dustRef.current, hiddenRef.current);
      if (!next) { setCleaning(false); setCleaningRoom(null); return; }

      activeTarget.current = next;
      const from = currentRoom.current;
      const startPt = posRef.current;
      const roomSeq = bfsPath(from, next);
      const travelPts = buildTravelPath(roomSeq, startPt);
      const cleanPts = buildCleanPath(next, dustRef.current, hiddenRef.current);

      let prev = startPt;
      let delay = 0;

      setCleaning(false);
      setCleaningRoom(null);

      for (const wp of travelPts) {
        const ms = msFor(prev, wp);
        const w = wp;
        timers.current.push(setTimeout(() => {
          if (cancelledRef.current || pausedRef.current) return;
          setDurationMs(ms); setPos(w);
        }, delay));
        delay += ms + 40;
        prev = wp;
      }

      timers.current.push(setTimeout(() => {
        if (cancelledRef.current) return;
        currentRoom.current = next;
        setCleaning(true);
        setCleaningRoom(next);
      }, delay));

      for (const cp of cleanPts) {
        const ms = msFor(prev, cp);
        const c = cp;
        timers.current.push(setTimeout(() => {
          if (cancelledRef.current || pausedRef.current) return;
          setDurationMs(ms); setPos(c);
        }, delay));
        delay += ms + 30;
        prev = cp;
      }

      // After cleaning pattern ends, pick next room based on current dust state
      timers.current.push(setTimeout(() => {
        if (cancelledRef.current) return;
        setCleaning(false);
        setCleaningRoom(null);
        activeTarget.current = null;
        scheduleRoom();
      }, delay + 300));
    }

    timers.current.push(setTimeout(scheduleRoom, 200));
    return () => clearTimers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRooms, roomScores]);

  // Pause/resume: when paused, clear timers. But we can't easily resume mid-path,
  // so we just stop transitions. The robot freezes in place.
  useEffect(() => {
    if (paused) {
      setDurationMs(0);
    }
  }, [paused]);

  return { pos, durationMs: paused ? 0 : durationMs, cleaning: paused ? false : cleaning, cleaningRoom: paused ? null : cleaningRoom };
}

/* ── 먼지 제거 훅: 로봇이 먼지에 접촉(반경 내) 하면 제거 ── */
const ROBOT_REACH = 18;

function useDustRemoval(
  dust: Dust[],
  robotPos: Pt,
  paused: boolean,
): Set<string> {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const prevDustKey = useRef("");

  const dustKey = dust.map((d) => d.id).join(",");
  useEffect(() => {
    if (dustKey !== prevDustKey.current) {
      prevDustKey.current = dustKey;
      setHidden(new Set());
    }
  }, [dustKey]);

  useEffect(() => {
    if (paused) return;
    setHidden((prev) => {
      let next: Set<string> | null = null;
      const r2 = ROBOT_REACH * ROBOT_REACH;
      for (const d of dust) {
        if (prev.has(d.id)) continue;
        const dx = d.x - robotPos.x;
        const dy = d.y - robotPos.y;
        if (dx * dx + dy * dy <= r2) {
          if (!next) next = new Set(prev);
          next.add(d.id);
        }
      }
      return next ?? prev;
    });
  }, [robotPos, dust, paused]);

  return hidden;
}

/* ── 사용자 아이콘 (CSS) ── */
function PersonIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: "none" }}>
      {/* 몸통 */}
      <circle cx={0} cy={-1} r={15} fill="rgba(255,255,255,0.9)" stroke="#4a6cf7" strokeWidth={1.5} />
      {/* 머리 */}
      <circle cx={0} cy={-6} r={4.5} fill="#4a6cf7" />
      {/* 어깨 */}
      <path d="M -7 2 Q 0 -2 7 2 V 7 Q 0 4 -7 7 Z" fill="#4a6cf7" rx={2} />
      {/* 라벨 */}
      <rect x={-18} y={16} width={36} height={14} rx={4} fill="#4a6cf7" />
      <text x={0} y={26} textAnchor="middle" style={{ font: "600 8px var(--font-sans)", fill: "white" }}>사용자</text>
    </g>
  );
}

/* ── 로봇 아이콘 ── */
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

/* ── 먼지 SVG ── */
function DustParticle({ d, hidden }: { d: Dust; hidden: boolean }) {
  return (
    <g style={{
      opacity: hidden ? 0 : 1,
      transform: hidden ? "scale(0)" : "scale(1)",
      transformOrigin: `${d.x}px ${d.y}px`,
      transition: "opacity 0.5s ease-out, transform 0.4s ease-out",
      pointerEvents: "none",
    }}>
      <circle cx={d.x} cy={d.y} r={5} fill="rgba(180,160,130,0.35)" />
      <circle cx={d.x - 1.5} cy={d.y - 1} r={2.8} fill="rgba(160,140,110,0.5)" />
      <circle cx={d.x + 2} cy={d.y + 1.5} r={2} fill="rgba(170,150,120,0.45)" />
      <circle cx={d.x + 0.5} cy={d.y - 2.5} r={1.5} fill="rgba(150,130,100,0.4)" />
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
  if (!rooms?.length) return `아파트 평면도. ${ROOMS_SEED.map((r) => `${r.name_ko} ${r.base_score}점`).join(", ")}.`;
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
    return (<polygon points={room.polygon} fill={fill} stroke={stroke} strokeWidth={strokeWidth}
      strokeLinejoin="round" style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick} />);
  }
  return (<rect x={room.bbox.x} y={room.bbox.y} width={room.bbox.w} height={room.bbox.h}
    fill={fill} stroke={stroke} strokeWidth={strokeWidth} rx={1}
    style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick} />);
}

/* ── 먼지 제거 완료 시 Need 항 baseline residual로 재계산, 진행 중에는 원본 유지 ──
 * 청소 직후 score가 0이 아니라 base × 0.2 + opportunity 합 (dirt accumulation 모델의 단순화).
 * breakdown도 함께 재작성되므로 RoomDetail·ExplanationCard에서 청소 후 산식이 그대로 보임.
 */
function useDisplayScores(
  rooms: RoomScore[] | undefined,
  dust: Dust[],
  hiddenDust: Set<string>,
): RoomScore[] | undefined {
  return useMemo(() => {
    if (!rooms) return undefined;
    return rooms.map((r) => {
      const total = dust.filter((d) => d.roomId === r.room_id).length;
      if (total === 0) return r;
      const removed = dust.filter((d) => d.roomId === r.room_id && hiddenDust.has(d.id)).length;
      if (removed < total) return r;
      // 청소 완료 — Need 합산 결과를 단일 baseline 라인으로 대체, Opportunity 항은 그대로
      const residualNeed = Math.round(r.base * 0.2);
      const opps = r.breakdown.filter((c) => c.axis === "opportunity");
      const oppSum = opps.reduce((s, c) => s + c.delta, 0);
      const cleanedBreakdown = [
        {
          source: "post_clean_baseline",
          label_ko: "청소 직후 baseline (Need 리셋)",
          delta: residualNeed,
          axis: "need" as const,
        },
        ...opps,
      ];
      return {
        ...r,
        final: residualNeed + oppSum,
        breakdown: cleanedBreakdown,
      };
    });
  }, [rooms, dust, hiddenDust]);
}

/* ── 메인 ── */
export function HouseMap({ rooms, userLocation, onRoomClick, paused = false, currentTime }: Props) {
  const [hoveredRoom, setHoveredRoom] = useState<RoomId | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const hasScenario = rooms && rooms.length > 0;
  const roomIds = useMemo(
    () => (rooms ? rooms.filter((r) => r.mode !== "excluded").map((r) => r.room_id) : []),
    // only regenerate when the set of room IDs changes, not on score changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rooms?.map((r) => r.room_id).join(",")],
  );
  const dustPool = useMemo(() => generateDustPool(roomIds), [roomIds]);
  const activeIds = useMemo(() => (rooms ? activeDustIds(dustPool, rooms) : new Set<string>()), [dustPool, rooms]);
  const dust = useMemo(() => dustPool.filter((d) => activeIds.has(d.id)), [dustPool, activeIds]);

  const [hiddenDust, setHiddenDustRaw] = useState<Set<string>>(new Set());
  const { pos: robotPos, durationMs, cleaning } = useRobotMotion(
    hasScenario ? rooms! : null, dust, hiddenDust, paused,
  );
  // dust removal feeds into hiddenDust — robot contact based
  const hiddenFromHook = useDustRemoval(dust, robotPos, paused);
  // sync hook output → state (avoid infinite loop by checking identity)
  const hiddenRef = useRef(hiddenDust);
  useEffect(() => {
    if (hiddenFromHook !== hiddenRef.current) {
      hiddenRef.current = hiddenFromHook;
      setHiddenDustRaw(hiddenFromHook);
    }
  }, [hiddenFromHook]);
  const displayScores = useDisplayScores(rooms, dust, hiddenDust);
  const scoreMap = new Map(displayScores?.map((r) => [r.room_id, r]) ?? []);

  return (
    <div className="relative">
      <svg viewBox="0 0 600 400" role="img" aria-label={buildAriaLabel(displayScores, userLocation)}
        className="w-full h-auto rounded-xl border border-border-default shadow-[0_4px_24px_-12px_rgba(0,0,0,0.2)] overflow-hidden">
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
        `}</style>

        <image href="/floorplan-bg.png" x={0} y={0} width={600} height={400} preserveAspectRatio="xMidYMid slice" />

        {/* 히트맵 오버레이 — 감소된 점수 반영 */}
        {ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const mode = (s?.mode ?? "normal") as Mode;
          const isHovered = hoveredRoom === room.id;
          let fill: string;
          if (!showOverlay) fill = "transparent";
          else if (mode === "excluded") fill = "url(#hatch)";
          else {
            const t = Math.min(Math.max(score, 0), 80) / 80;
            const eased = Math.pow(t, 2.2);
            fill = `rgba(20, 50, 100, ${0.05 + eased * 0.6})`;
          }
          return (
            <RoomShape key={room.id} room={room} fill={fill}
              stroke={showOverlay && isHovered ? "oklch(40% 0.15 250)" : "transparent"}
              strokeWidth={isHovered && showOverlay ? 2.5 : 0}
              style={{ transition: "fill 0.6s ease, stroke 0.2s ease", cursor: onRoomClick ? "pointer" : "default" }}
              onMouseEnter={() => setHoveredRoom(room.id)} onMouseLeave={() => setHoveredRoom(null)}
              onClick={() => { if (s) onRoomClick?.(s); }} />
          );
        })}

        {/* 먼지 (항상 표시) */}
        {dust.map((d) => <DustParticle key={d.id} d={d} hidden={hiddenDust.has(d.id)} />)}

        {/* 라벨 + 점수 — 감소된 점수 표시 */}
        {showOverlay && ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const c = roomCenter(room);
          return (
            <g key={`lbl-${room.id}`} style={{ pointerEvents: "none" }}>
              <rect x={c.x - 28} y={c.y - 14} width={56} height={30} rx={5} fill="rgba(255,255,255,0.75)" stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
              <text x={c.x} y={c.y - 1} textAnchor="middle" style={{ font: "500 11px var(--font-sans)", fill: "#333" }}>{room.name_ko}</text>
              <text x={c.x} y={c.y + 13} textAnchor="middle" style={{ font: "700 13px var(--font-mono)", fill: "#111" }}>
                {displayScores ? <AnimatedScoreText score={score} /> : score}
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

        <RobotIcon x={robotPos.x} y={robotPos.y} durationMs={durationMs} cleaning={cleaning} />
      </svg>

      {currentTime && (
        <div
          aria-label="현재 시각"
          className="absolute top-3 right-3 flex items-center gap-2 rounded-md bg-white/85 backdrop-blur-sm px-3 py-1.5 font-mono text-[16px] font-semibold text-text-default tracking-[0.12em] tabular-nums"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-text-default animate-pulse" aria-hidden />
          {currentTime}
        </div>
      )}

      <button type="button" onClick={() => setShowOverlay((v) => !v)}
        className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-border-default px-2.5 py-1.5 text-[11px] font-medium text-gray-600 shadow-sm hover:bg-white/95 transition-colors">
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
