"use client";
import { useEffect, useRef, useState } from "react";
import { ROOMS_SEED, ROOM_LABEL, type Mode, type RoomId, type RoomScore } from "@/lib/types";
import { scoreToFill } from "@/lib/colors";

type Props = {
  rooms?: RoomScore[];
  userLocation?: RoomId | null;
  onRoomClick?: (roomId: RoomId) => void;
};

// ── 가구 SVG (건축 도면 스타일) ──────────────────────────────

function BedroomFurniture() {
  return (
    <g stroke="#888" strokeWidth={0.8} fill="none" strokeLinejoin="round">
      {/* 침대 (더블) */}
      <rect x={30} y={40} width={75} height={110} rx={2} />
      <line x1={30} y1={95} x2={105} y2={95} />
      {/* 베개 2개 */}
      <rect x={36} y={100} width={28} height={14} rx={3} />
      <rect x={70} y={100} width={28} height={14} rx={3} />
      {/* 헤드보드 */}
      <rect x={28} y={115} width={79} height={5} rx={1} fill="#ccc" />
      {/* 옷장 */}
      <rect x={140} y={30} width={40} height={80} rx={1} />
      <line x1={160} y1={30} x2={160} y2={110} />
      {/* 협탁 */}
      <rect x={115} y={100} width={20} height={20} rx={1} />
    </g>
  );
}

function KitchenFurniture() {
  return (
    <g stroke="#888" strokeWidth={0.8} fill="none" strokeLinejoin="round">
      {/* 상부 카운터 (ㄱ자) */}
      <rect x={210} y={22} width={320} height={18} rx={1} fill="#e5e5e5" stroke="#aaa" />
      {/* 싱크 */}
      <rect x={440} y={25} width={30} height={12} rx={4} />
      <circle cx={455} cy={31} r={3} />
      {/* 가스레인지/인덕션 */}
      <rect x={360} y={26} width={24} height={10} rx={1} />
      <circle cx={367} cy={31} r={3} />
      <circle cx={379} cy={31} r={3} />
      {/* 냉장고 */}
      <rect x={500} y={22} width={36} height={48} rx={2} fill="#e0e0e0" stroke="#aaa" />
      <line x1={518} y1={22} x2={518} y2={70} strokeDasharray="2 2" />
      {/* 식탁 */}
      <rect x={300} y={80} width={80} height={56} rx={3} />
      {/* 의자 4개 */}
      <rect x={310} y={72} width={16} height={8} rx={3} />
      <rect x={354} y={72} width={16} height={8} rx={3} />
      <rect x={310} y={136} width={16} height={8} rx={3} />
      <rect x={354} y={136} width={16} height={8} rx={3} />
      {/* 좌측 의자 2개 */}
      <rect x={290} y={90} width={8} height={16} rx={3} />
      <rect x={290} y={112} width={8} height={16} rx={3} />
    </g>
  );
}

function LivingFurniture() {
  return (
    <g stroke="#888" strokeWidth={0.8} fill="none" strokeLinejoin="round">
      {/* L자 소파 */}
      <rect x={140} y={260} width={120} height={50} rx={3} />
      <rect x={130} y={260} width={10} height={50} rx={2} fill="#ddd" stroke="#aaa" />
      <rect x={140} y={310} width={50} height={10} rx={2} fill="#ddd" stroke="#aaa" />
      {/* 쿠션 */}
      <rect x={148} y={268} width={30} height={34} rx={4} strokeDasharray="2 2" />
      <rect x={184} y={268} width={30} height={34} rx={4} strokeDasharray="2 2" />
      <rect x={220} y={268} width={30} height={34} rx={4} strokeDasharray="2 2" />
      {/* TV (벽면) */}
      <rect x={200} y={196} width={80} height={6} rx={1} fill="#555" />
      {/* TV 스탠드 */}
      <rect x={210} y={202} width={60} height={16} rx={1} />
      {/* 커피테이블 */}
      <rect x={180} y={240} width={60} height={18} rx={6} />
      {/* 러그 */}
      <rect x={160} y={230} width={100} height={26} rx={8} strokeDasharray="3 3" stroke="#bbb" />
      {/* 스탠드 조명 */}
      <circle cx={345} cy={210} r={6} />
      <line x1={345} y1={216} x2={345} y2={230} />
    </g>
  );
}

function EntranceFurniture() {
  return (
    <g stroke="#888" strokeWidth={0.8} fill="none" strokeLinejoin="round">
      {/* 현관문 (아치) */}
      <path d="M 16 384 L 16 340" strokeWidth={3} stroke="#555" />
      <path d="M 16 340 Q 16 300 56 300" strokeWidth={0.6} strokeDasharray="2 2" />
      {/* 신발장 */}
      <rect x={24} y={200} width={60} height={20} rx={1} />
      <line x1={44} y1={200} x2={44} y2={220} />
      <line x1={64} y1={200} x2={64} y2={220} />
      {/* 신발 */}
      <ellipse cx={35} cy={250} rx={7} ry={4} />
      <ellipse cx={55} cy={252} rx={7} ry={4} />
    </g>
  );
}

function BathroomFurniture() {
  return (
    <g stroke="#888" strokeWidth={0.8} fill="none" strokeLinejoin="round">
      {/* 욕조 */}
      <rect x={420} y={260} width={100} height={55} rx={12} />
      <rect x={428} y={268} width={84} height={39} rx={8} strokeDasharray="2 2" />
      {/* 수도꼭지 */}
      <circle cx={470} cy={260} r={3} fill="#aaa" />
      {/* 세면대 */}
      <rect x={420} y={200} width={40} height={30} rx={10} />
      <circle cx={440} cy={215} r={5} />
      {/* 변기 */}
      <ellipse cx={500} cy={220} rx={14} ry={18} />
      <rect x={490} y={200} width={20} height={10} rx={4} />
      {/* 거울 */}
      <rect x={425} y={192} width={30} height={4} rx={1} fill="#ccc" />
    </g>
  );
}

const FURNITURE_MAP: Record<RoomId, () => React.JSX.Element> = {
  bedroom: BedroomFurniture,
  kitchen: KitchenFurniture,
  living: LivingFurniture,
  entrance: EntranceFurniture,
  bathroom: BathroomFurniture,
};

// ── 내벽 + 문 ────────────────────────────────────────────────

function Walls() {
  return (
    <g stroke="#1a1a1a" fill="none">
      {/* 외벽 */}
      <rect x={12} y={12} width={536} height={380} strokeWidth={4} rx={1} />
      {/* 수평 내벽 — 상하 분할 (y=184) */}
      <line x1={12} y1={184} x2={548} y2={184} strokeWidth={3} />
      {/* 수직 내벽 — 침실 | 주방 (x=192) */}
      <line x1={192} y1={12} x2={192} y2={184} strokeWidth={3} />
      {/* 수직 내벽 — 현관 | 거실 (x=112) */}
      <line x1={112} y1={184} x2={112} y2={392} strokeWidth={3} />
      {/* 수직 내벽 — 거실 | 욕실 (x=396) */}
      <line x1={396} y1={184} x2={396} y2={392} strokeWidth={3} />

      {/* 문 (벽 끊기) — 흰색 사각형 */}
      {/* 침실↔주방 문 */}
      <rect x={190} y={80} width={5} height={36} fill="white" stroke="none" />
      {/* 침실↔거실 문 (하단 벽) */}
      <rect x={80} y={182} width={30} height={5} fill="white" stroke="none" />
      {/* 주방↔거실 문 */}
      <rect x={240} y={182} width={36} height={5} fill="white" stroke="none" />
      {/* 거실↔욕실 문 */}
      <rect x={394} y={280} width={5} height={36} fill="white" stroke="none" />
      {/* 현관↔거실 문 */}
      <rect x={110} y={300} width={5} height={36} fill="white" stroke="none" />

      {/* 문 아크 (건축 도면 스타일) */}
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
  if (score >= 50) return "#1a1a1a";
  return "#4a4a4a";
}

// ── 아이콘 ───────────────────────────────────────────────────

function PersonIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={0} r={12} fill="white" stroke="#1a1a1a" strokeWidth={1.2} />
      <circle cx={0} cy={-5} r={3.5} fill="#1a1a1a" />
      <path d="M -5 1 q 5 -3 10 0 v 5 q -5 3 -10 0 z" fill="#1a1a1a" />
      <text x={0} y={22} textAnchor="middle" style={{ font: "600 9px var(--font-sans)", fill: "#1a1a1a" }}>
        사용자
      </text>
    </g>
  );
}

function RobotIcon({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)` }} className="transition-transform duration-1000 ease-in-out">
      <circle cx={0} cy={0} r={14} fill="oklch(45% 0 0)" opacity={0.1}>
        <animate attributeName="r" values="14;19;14" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.1;0.04;0.1" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={0} cy={0} r={11} fill="oklch(25% 0 0)" stroke="white" strokeWidth={1.5} />
      <circle cx={-3.5} cy={-2} r={1.8} fill="white" />
      <circle cx={3.5} cy={-2} r={1.8} fill="white" />
      <path d="M -4 3.5 q 4 3 8 0" stroke="white" strokeWidth={1} fill="none" strokeLinecap="round" />
      <text x={0} y={23} textAnchor="middle" style={{ font: "600 8px var(--font-sans)", fill: "oklch(25% 0 0)" }}>
        청소기
      </text>
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
    <text textAnchor="middle" style={{ font: "600 13px var(--font-mono)", fill: scoreTextColor(score, mode) }}>
      {display}
    </text>
  );
}

// ── Aria 라벨 ────────────────────────────────────────────────

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

// ── 메인 컴포넌트 ────────────────────────────────────────────

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
        className="w-full h-auto rounded-xl bg-white border border-border-default shadow-[0_4px_24px_-12px_rgba(0,0,0,0.2)]"
      >
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6">
            <path d="M0 6 L6 0" stroke="#9ca3af" strokeWidth="1" />
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
              x={room.bbox.x}
              y={room.bbox.y}
              width={room.bbox.w}
              height={room.bbox.h}
              fill={scoreToFill(score, mode)}
              stroke="none"
              style={{ transition: "fill 0.6s ease", cursor: onRoomClick ? "pointer" : "default" }}
              onMouseEnter={() => setHoveredRoom(room.id)}
              onMouseLeave={() => setHoveredRoom(null)}
              onClick={() => onRoomClick?.(room.id)}
            />
          );
        })}

        {/* Layer 2: 가구 */}
        {ROOMS_SEED.map((room) => {
          const Comp = FURNITURE_MAP[room.id];
          return <Comp key={`fur-${room.id}`} />;
        })}

        {/* Layer 3: 벽 + 문 */}
        <Walls />

        {/* Layer 4: hover 하이라이트 */}
        {hoveredRoom && (() => {
          const room = ROOMS_SEED.find((r) => r.id === hoveredRoom);
          if (!room) return null;
          return (
            <rect
              x={room.bbox.x} y={room.bbox.y}
              width={room.bbox.w} height={room.bbox.h}
              fill="none" stroke="oklch(30% 0 0)" strokeWidth={2.5}
              style={{ pointerEvents: "none" }}
            />
          );
        })()}

        {/* Layer 5: 라벨 + 점수 */}
        {ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const mode = (s?.mode ?? "normal") as Mode;
          const cx = room.bbox.x + room.bbox.w / 2;
          const cy = room.bbox.y + room.bbox.h / 2;
          return (
            <g key={`lbl-${room.id}`} style={{ pointerEvents: "none" }}>
              <text x={cx} y={cy - 6} textAnchor="middle" style={{ font: "500 14px var(--font-sans)", fill: scoreTextColor(score, mode) }}>
                {room.name_ko}
              </text>
              <g transform={`translate(${cx}, ${cy + 12})`}>
                <AnimatedScore score={score} mode={mode} />
              </g>
            </g>
          );
        })}

        {/* Layer 6: 사용자 */}
        {userLocation && (() => {
          const room = ROOMS_SEED.find((r) => r.id === userLocation);
          if (!room) return null;
          return <PersonIcon x={room.bbox.x + room.bbox.w - 26} y={room.bbox.y + 28} />;
        })()}

        {/* Layer 7: 로봇 청소기 */}
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
