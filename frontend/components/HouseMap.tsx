"use client";
import { useEffect, useRef, useState } from "react";
import { ROOMS_SEED, ROOM_LABEL, type Mode, type RoomId, type RoomScore } from "@/lib/types";
import { scoreToFill } from "@/lib/colors";

type Props = {
  rooms?: RoomScore[];
  userLocation?: RoomId | null;
  onRoomClick?: (roomId: RoomId) => void;
};

// ── 가구 (레퍼런스 도면 참고, 건축 도면 스타일) ─────────────

function Furniture() {
  const s = "oklch(65% 0 0)";
  const w = 0.8;
  return (
    <g stroke={s} strokeWidth={w} fill="none" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
      {/* ── 침실 ── */}
      {/* 침대 (더블) */}
      <rect x={40} y={60} width={80} height={110} rx={2} />
      <line x1={40} y1={115} x2={120} y2={115} />
      <rect x={48} y={120} width={28} height={14} rx={4} />
      <rect x={84} y={120} width={28} height={14} rx={4} />
      <rect x={38} y={138} width={84} height={5} rx={1} fill="oklch(88% 0 0)" />
      {/* 옷장 */}
      <rect x={160} y={30} width={42} height={90} rx={1} />
      <line x1={181} y1={30} x2={181} y2={120} />
      {/* 협탁 */}
      <rect x={128} y={120} width={22} height={22} rx={1} />

      {/* ── 주방 ── */}
      {/* 상부 카운터 */}
      <rect x={234} y={20} width={336} height={20} rx={1} fill="oklch(92% 0 0)" stroke={s} />
      {/* 싱크 */}
      <rect x={460} y={24} width={32} height={13} rx={5} />
      <circle cx={476} cy={30} r={3} />
      {/* 인덕션 */}
      <rect x={370} y={25} width={26} height={12} rx={1} />
      <circle cx={378} cy={31} r={3} />
      <circle cx={390} cy={31} r={3} />
      {/* 냉장고 */}
      <rect x={530} y={20} width={42} height={52} rx={2} fill="oklch(90% 0 0)" stroke={s} />
      <line x1={551} y1={20} x2={551} y2={72} strokeDasharray="2 2" />
      {/* 식탁 + 의자 6개 */}
      <rect x={320} y={80} width={90} height={60} rx={4} />
      <rect x={332} y={70} width={18} height={10} rx={4} />
      <rect x={380} y={70} width={18} height={10} rx={4} />
      <rect x={332} y={140} width={18} height={10} rx={4} />
      <rect x={380} y={140} width={18} height={10} rx={4} />
      <rect x={308} y={92} width={10} height={18} rx={4} />
      <rect x={308} y={118} width={10} height={18} rx={4} />

      {/* ── 현관 ── */}
      {/* 신발장 */}
      <rect x={28} y={222} width={80} height={18} rx={1} />
      <line x1={48} y1={222} x2={48} y2={240} />
      <line x1={68} y1={222} x2={68} y2={240} />
      <line x1={88} y1={222} x2={88} y2={240} />
      {/* 신발 */}
      <ellipse cx={42} cy={268} rx={8} ry={4} />
      <ellipse cx={66} cy={270} rx={8} ry={4} />

      {/* ── 거실 ── */}
      {/* L자 소파 */}
      <rect x={170} y={310} width={140} height={52} rx={4} />
      <rect x={158} y={310} width={12} height={52} rx={2} fill="oklch(90% 0 0)" stroke={s} />
      <rect x={170} y={362} width={50} height={12} rx={2} fill="oklch(90% 0 0)" stroke={s} />
      {/* 쿠션 */}
      <rect x={178} y={318} width={36} height={36} rx={5} strokeDasharray="2 2" />
      <rect x={220} y={318} width={36} height={36} rx={5} strokeDasharray="2 2" />
      <rect x={262} y={318} width={36} height={36} rx={5} strokeDasharray="2 2" />
      {/* TV */}
      <rect x={220} y={214} width={90} height={6} rx={1} fill="oklch(40% 0 0)" />
      <rect x={235} y={222} width={60} height={16} rx={1} />
      {/* 커피테이블 */}
      <rect x={210} y={280} width={68} height={22} rx={8} />
      {/* 러그 (점선) */}
      <rect x={190} y={270} width={108} height={36} rx={10} strokeDasharray="4 3" stroke="oklch(75% 0 0)" />
      {/* 스탠드 */}
      <circle cx={370} cy={230} r={6} />
      <line x1={370} y1={236} x2={370} y2={252} />

      {/* ── 욕실 ── */}
      {/* 욕조 */}
      <rect x={424} y={306} width={130} height={60} rx={14} />
      <rect x={434} y={316} width={110} height={40} rx={10} strokeDasharray="2 2" />
      {/* 수도꼭지 */}
      <circle cx={489} cy={306} r={3} fill="oklch(75% 0 0)" />
      {/* 세면대 */}
      <rect x={424} y={224} width={44} height={34} rx={12} />
      <circle cx={446} cy={240} r={6} />
      {/* 거울 */}
      <rect x={430} y={214} width={32} height={4} rx={1} fill="oklch(85% 0 0)" />
      {/* 변기 */}
      <ellipse cx={520} cy={248} rx={16} ry={20} />
      <rect x={507} y={226} width={26} height={12} rx={5} />
    </g>
  );
}

// ── 벽 + 문 ─────────────────────────────────────────────────

function Walls() {
  return (
    <g style={{ pointerEvents: "none" }}>
      {/* 외벽 */}
      <rect x={12} y={12} width={576} height={396} fill="none" stroke="oklch(25% 0 0)" strokeWidth={5} rx={2} />

      {/* 내벽 */}
      <g stroke="oklch(25% 0 0)" strokeWidth={4}>
        {/* 수평 — 상하 분할 */}
        <line x1={12} y1={206} x2={588} y2={206} />
        {/* 수직 — 침실 | 주방 */}
        <line x1={218} y1={12} x2={218} y2={206} />
        {/* 수직 — 현관 | 거실 */}
        <line x1={138} y1={206} x2={138} y2={408} />
        {/* 수직 — 거실 | 욕실 */}
        <line x1={402} y1={206} x2={402} y2={408} />
      </g>

      {/* 문 (벽 끊기) */}
      <g fill="white" stroke="none">
        <rect x={216} y={90} width={6} height={40} />
        <rect x={100} y={204} width={36} height={6} />
        <rect x={270} y={204} width={40} height={6} />
        <rect x={400} y={300} width={6} height={40} />
        <rect x={136} y={310} width={6} height={40} />
      </g>

      {/* 문 아크 (건축 도면 스타일) */}
      <g fill="none" stroke="oklch(55% 0 0)" strokeWidth={0.6} strokeDasharray="2 2">
        <path d="M 222 90 Q 248 90 248 116" />
        <path d="M 100 204 Q 100 178 126 178" />
        <path d="M 310 204 Q 310 180 288 180" />
        <path d="M 402 340 Q 426 340 426 320" />
        <path d="M 138 310 Q 162 310 162 332" />
      </g>

      {/* 현관문 (하단 좌측) */}
      <line x1={16} y1={370} x2={16} y2={408} stroke="oklch(25% 0 0)" strokeWidth={5} />
      <path d="M 16 370 Q 16 336 50 336" fill="none" stroke="oklch(55% 0 0)" strokeWidth={0.6} strokeDasharray="2 2" />
    </g>
  );
}

// ── 아이콘 ───────────────────────────────────────────────────

function PersonIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: "none" }}>
      <circle cx={0} cy={0} r={13} fill="white" stroke="oklch(25% 0 0)" strokeWidth={1.2} />
      <circle cx={0} cy={-5} r={3.5} fill="oklch(25% 0 0)" />
      <path d="M -5 1 q 5 -3 10 0 v 5 q -5 3 -10 0 z" fill="oklch(25% 0 0)" />
      <text x={0} y={24} textAnchor="middle" style={{ font: "600 9px var(--font-sans)", fill: "oklch(25% 0 0)" }}>사용자</text>
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
      setVal(Math.round(from + (target - from) * (1 - (1 - t) * (1 - t))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function scoreTextColor(score: number, mode: Mode): string {
  if (mode === "excluded") return "#999";
  if (score >= 50) return "#1a1a1a";
  return "#444";
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
          <defs><pattern id="hl" patternUnits="userSpaceOnUse" width="4" height="4"><path d="M0 4 L4 0" stroke="#9ca3af" strokeWidth="0.8" /></pattern></defs>
          <rect width={16} height={10} fill="url(#hl)" />
        </svg>
        <span>제외</span>
      </div>
    </div>
  );
}

// ── Aria ─────────────────────────────────────────────────────

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

// ── 메인 ─────────────────────────────────────────────────────

export function HouseMap({ rooms, userLocation, onRoomClick }: Props) {
  const scoreMap = new Map(rooms?.map((r) => [r.room_id, r]) ?? []);
  const [hoveredRoom, setHoveredRoom] = useState<RoomId | null>(null);

  const topRoom = rooms?.filter((r) => r.mode !== "excluded").sort((a, b) => b.final - a.final)[0];
  const robotSeed = topRoom ? ROOMS_SEED.find((r) => r.id === topRoom.room_id) : null;
  const robotX = robotSeed ? robotSeed.bbox.x + robotSeed.bbox.w / 2 : -100;
  const robotY = robotSeed ? robotSeed.bbox.y + robotSeed.bbox.h / 2 + 10 : -100;

  return (
    <div>
      <svg
        viewBox="0 0 600 420"
        role="img"
        aria-label={buildAriaLabel(rooms, userLocation)}
        className="w-full h-auto rounded-xl border border-border-default bg-white shadow-[0_4px_24px_-12px_rgba(0,0,0,0.2)] overflow-hidden"
      >
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6">
            <path d="M0 6 L6 0" stroke="rgba(120,120,120,0.5)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Layer 1: 방 히트맵 */}
        {ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const mode = (s?.mode ?? "normal") as Mode;
          const isHovered = hoveredRoom === room.id;
          return (
            <rect
              key={room.id}
              x={room.bbox.x} y={room.bbox.y}
              width={room.bbox.w} height={room.bbox.h}
              fill={scoreToFill(score, mode)}
              stroke={isHovered ? "oklch(40% 0.12 250)" : "none"}
              strokeWidth={isHovered ? 2 : 0}
              style={{ transition: "fill 0.6s ease", cursor: onRoomClick ? "pointer" : "default" }}
              onMouseEnter={() => setHoveredRoom(room.id)}
              onMouseLeave={() => setHoveredRoom(null)}
              onClick={() => onRoomClick?.(room.id)}
            />
          );
        })}

        {/* Layer 2: 가구 */}
        <Furniture />

        {/* Layer 3: 벽 + 문 */}
        <Walls />

        {/* Layer 4: 라벨 + 점수 */}
        {ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const mode = (s?.mode ?? "normal") as Mode;
          const cx = room.bbox.x + room.bbox.w / 2;
          const cy = room.bbox.y + room.bbox.h / 2;
          const txtColor = scoreTextColor(score, mode);
          return (
            <g key={`lbl-${room.id}`} style={{ pointerEvents: "none" }}>
              <text x={cx} y={cy - 4} textAnchor="middle" style={{ font: "500 14px var(--font-sans)", fill: txtColor }}>
                {room.name_ko}
              </text>
              <text x={cx} y={cy + 14} textAnchor="middle" style={{ font: "700 13px var(--font-mono)", fill: txtColor }}>
                {rooms ? <AnimatedScoreText score={score} mode={mode} /> : score}
              </text>
            </g>
          );
        })}

        {/* Layer 5: 사용자 */}
        {userLocation && (() => {
          const room = ROOMS_SEED.find((r) => r.id === userLocation);
          if (!room) return null;
          return <PersonIcon x={room.bbox.x + room.bbox.w - 24} y={room.bbox.y + 26} />;
        })()}

        {/* Layer 6: 로봇 청소기 */}
        {rooms && rooms.length > 0 && <RobotIcon x={robotX} y={robotY} />}
      </svg>
      <HeatmapLegend />
    </div>
  );
}

function AnimatedScoreText({ score, mode }: { score: number; mode: Mode }) {
  const display = useCountUp(score);
  return <>{display}</>;
}
