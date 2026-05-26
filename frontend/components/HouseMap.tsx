"use client";
import { useEffect, useRef, useState } from "react";
import { ROOMS_SEED, ROOM_LABEL, type Mode, type RoomId, type RoomScore } from "@/lib/types";

type Props = {
  rooms?: RoomScore[];
  userLocation?: RoomId | null;
  onRoomClick?: (roomId: RoomId) => void;
};

function scoreTextColor(score: number, mode: Mode): string {
  if (mode === "excluded") return "#999";
  if (score >= 50) return "#fff";
  return "#1a1a1a";
}

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
    <g className="transition-all duration-[1200ms] ease-in-out" style={{ transform: `translate(${x}px, ${y}px)` }}>
      {/* 펄스 링 */}
      <circle cx={0} cy={0} r={18} fill="none" stroke="oklch(50% 0.12 250)" strokeWidth={1.2} opacity={0.3}>
        <animate attributeName="r" values="18;25;18" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* 그림자 */}
      <ellipse cx={1} cy={2} rx={13} ry={12} fill="rgba(0,0,0,0.1)" />
      {/* 로봇 본체 */}
      <circle cx={0} cy={0} r={13} fill="#f8f8f8" stroke="#bbb" strokeWidth={1.2} />
      <circle cx={0} cy={0} r={11} fill="none" stroke="#ddd" strokeWidth={0.6} />
      {/* 라이다 범프 */}
      <circle cx={0} cy={-3} r={4} fill="#eee" stroke="#ccc" strokeWidth={0.6} />
      {/* 카메라 */}
      <rect x={-2.5} y={-12.5} width={5} height={2.5} rx={1} fill="#444" />
      {/* 레드 LED */}
      <circle cx={0} cy={5} r={1.5} fill="#e53935">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* 라벨 */}
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

function AnimatedScore({ score, mode }: { score: number; mode: Mode }) {
  const display = useCountUp(score);
  return <tspan style={{ font: "700 14px var(--font-mono)" }}>{display}</tspan>;
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

        {/* 도면 배경 이미지 — viewBox 전체 */}
        <image
          href="/floorplan-bg.png"
          x={0} y={0}
          width={600} height={400}
          preserveAspectRatio="xMidYMid slice"
        />

        {/* 히트맵 오버레이 (반투명) */}
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
            const alpha = 0.08 + t * 0.32;
            fill = `rgba(20, 60, 120, ${alpha})`;
          }

          return (
            <rect
              key={room.id}
              x={room.bbox.x} y={room.bbox.y}
              width={room.bbox.w} height={room.bbox.h}
              fill={fill}
              stroke={isHovered ? "oklch(40% 0.12 250)" : "transparent"}
              strokeWidth={isHovered ? 2.5 : 0}
              rx={2}
              style={{ transition: "fill 0.6s ease, stroke 0.2s ease", cursor: onRoomClick ? "pointer" : "default" }}
              onMouseEnter={() => setHoveredRoom(room.id)}
              onMouseLeave={() => setHoveredRoom(null)}
              onClick={() => onRoomClick?.(room.id)}
            />
          );
        })}

        {/* 라벨 + 점수 */}
        {ROOMS_SEED.map((room) => {
          const s = scoreMap.get(room.id);
          const score = s?.final ?? room.base_score;
          const mode = (s?.mode ?? "normal") as Mode;
          const cx = room.bbox.x + room.bbox.w / 2;
          const cy = room.bbox.y + room.bbox.h / 2;
          const txtColor = scoreTextColor(score, mode);
          const bgAlpha = score >= 50 ? 0.6 : mode === "excluded" ? 0.4 : 0.55;

          return (
            <g key={`lbl-${room.id}`} style={{ pointerEvents: "none" }}>
              <rect
                x={cx - 30} y={cy - 16}
                width={60} height={34} rx={5}
                fill={`rgba(255,255,255,${bgAlpha})`}
                stroke="rgba(0,0,0,0.08)" strokeWidth={0.5}
              />
              <text x={cx} y={cy - 2} textAnchor="middle" style={{ font: "500 11px var(--font-sans)", fill: txtColor === "#fff" ? "#333" : txtColor }}>
                {room.name_ko}
              </text>
              <text x={cx} y={cy + 14} textAnchor="middle" style={{ fill: txtColor === "#fff" ? "#111" : txtColor }}>
                <AnimatedScore score={score} mode={mode} />
              </text>
            </g>
          );
        })}

        {/* 사용자 */}
        {userLocation && (() => {
          const room = ROOMS_SEED.find((r) => r.id === userLocation);
          if (!room) return null;
          return <PersonIcon x={room.bbox.x + room.bbox.w - 22} y={room.bbox.y + 24} />;
        })()}

        {/* 로봇 청소기 — 우선순위 1위 방 중앙으로 이동 */}
        {rooms && rooms.length > 0 && (
          <RobotIcon x={robotX} y={robotY} />
        )}
      </svg>
      <HeatmapLegend />
    </div>
  );
}
