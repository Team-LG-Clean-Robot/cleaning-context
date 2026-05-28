"use client";
import { useState } from "react";

const LAYERS = [
  { num: "01", ko: "센서", en: "Sensor", side: "edge" },
  { num: "02", ko: "사용자 위치·맥락", en: "Behavioral", side: "edge" },
  { num: "03", ko: "공간 이해", en: "Spatial", side: "cloud" },
  { num: "04", ko: "상황 종합", en: "Context", side: "cloud" },
  { num: "05", ko: "의사결정", en: "Decision", side: "cloud" },
  { num: "06", ko: "이유 설명", en: "Explanation", side: "cloud" },
] as const;

const ROLES = [
  {
    title: "ML — 사용자 위치 추정",
    purpose: "박주상 v3 설계 — `user_room` 추정",
    inputs: "IoT 위치성 센서 (motion·door_lock·bed·tv·induction…)",
    outputs: "현재 사용자 위치 + confidence",
    why: "디바이스 측에서 실행 가능, raw 센서가 외부로 나가지 않음",
  },
  {
    title: "Rule — 맥락 + 점수",
    purpose: "단기 맥락 변수 + 결정론적 점수 계산",
    inputs: "사용자 위치 + 센서 상태 + 외부 변수 (날씨·캘린더)",
    outputs: "8개 맥락 변수 + 공간별 priority score",
    why: "일관성·재현성·디버깅 가능 — 점수가 왜 나왔는지 100% 추적",
  },
  {
    title: "LLM — 자연어 설명",
    purpose: "점수표를 자연어로 풀어쓰기",
    inputs: "점수표 + 컨텍스트 요약",
    outputs: "왜 이 공간을 먼저/제외하는지 설명",
    why: "결정에는 관여하지 않음 — 장애 시 fallback 응답으로 동작 계속",
  },
];

export function MethodologyCard() {
  const [open, setOpen] = useState(true);
  return (
    <section className="bg-white border border-border-default rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[14px] text-text-default leading-relaxed max-w-[72ch]">
          IoT 멀티센서로 생활 맥락을 읽어 청소 우선순위를 결정합니다{" "}
          <span className="text-accent-500 font-medium">(맥락 인식)</span>. ML·rule 추론은
          디바이스(엣지)에서 끝나고, 클라우드로는 high-level event만 전송됩니다{" "}
          <span className="text-accent-500 font-medium">(Privacy-on-Edge)</span>. 점수
          계산은 Rule 결정론, 설명만 LLM이 담당 — "왜 이렇게 청소했는지" 100% 추적
          가능합니다.
        </p>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="shrink-0 bg-surface-base hover:bg-border-default/40 border border-border-default rounded-md px-3 py-1.5 text-[13px] font-medium transition"
        >
          {open ? "접기" : "어떻게 동작하나?"}
        </button>
      </div>

      {open && (
        <div className="mt-6 space-y-5">
          {/* 6-Layer 다이어그램 — 모바일에선 가로 스크롤 */}
          <div className="overflow-x-auto -mx-2 px-2">
          <svg
            viewBox="0 0 1056 156"
            className="h-auto"
            style={{ minWidth: 800 }}
            role="img"
            aria-label="6단계 처리 흐름: 센서 → 사용자 위치·맥락 (디바이스 측) / 공간 이해 → 상황 종합 → 의사결정 → 이유 설명 (클라우드 측)"
          >
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX={9}
                refY={5}
                markerWidth={6}
                markerHeight={6}
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#8A8A8A" />
              </marker>
            </defs>

            {/* Edge / Cloud 라벨 (상단) */}
            <text x={4} y={12} fill="#047857" style={{ font: '600 10px var(--font-mono)' }}>
              EDGE (디바이스)
            </text>
            <text x={360} y={12} fill="#6b7280" style={{ font: '600 10px var(--font-mono)' }}>
              ─ high-level event only ─
            </text>
            <text x={620} y={12} fill="#374151" style={{ font: '600 10px var(--font-mono)' }}>
              CLOUD (서버)
            </text>

            {LAYERS.map((L, i) => {
              const x = i * 176;
              const isEdge = L.side === "edge";
              const fillColor = isEdge ? "oklch(96% 0.04 145)" : "oklch(97% 0 0)";
              const strokeColor = isEdge ? "oklch(70% 0.12 145)" : "oklch(85% 0 0)";
              return (
                <g key={L.num} transform={`translate(${x}, 30)`}>
                  <rect
                    width={160}
                    height={96}
                    rx={10}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={1.5}
                  />
                  <text
                    x={12}
                    y={22}
                    fill="oklch(50% 0 0)"
                    style={{ font: '600 11px var(--font-mono)' }}
                  >
                    {L.num}
                  </text>
                  <text
                    x={80}
                    y={56}
                    textAnchor="middle"
                    fill="#1A1A1A"
                    style={{ font: '600 14px var(--font-sans)' }}
                  >
                    {L.ko}
                  </text>
                  <text
                    x={80}
                    y={76}
                    textAnchor="middle"
                    fill="#8A8A8A"
                    style={{ font: '400 11px var(--font-mono)' }}
                  >
                    {L.en}
                  </text>
                  {i < LAYERS.length - 1 && (
                    <path
                      d="M 160 56 L 176 56"
                      stroke="#8A8A8A"
                      strokeWidth={1.5}
                      markerEnd="url(#arrow)"
                    />
                  )}
                </g>
              );
            })}

            {/* Edge/Cloud 경계 — Behavioral(02)과 Spatial(03) 사이 점선 */}
            <line
              x1={352 - 8}
              y1={20}
              x2={352 - 8}
              y2={140}
              stroke="#047857"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={352 - 8}
              y={150}
              textAnchor="middle"
              fill="#047857"
              style={{ font: '600 10px var(--font-mono)' }}
            >
              🛡 Privacy Boundary
            </text>
          </svg>
          </div>

          {/* 3-Role 표 — 모바일 1열, md↑ 3열 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border-default rounded-lg overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border-default">
            {ROLES.map((r) => (
              <div
                key={r.title}
                className="p-4"
              >
                <div className="text-[11px] uppercase tracking-wider text-accent-500 font-semibold mb-2">
                  {r.title}
                </div>
                <dl className="space-y-1.5 text-[12px]">
                  <div className="grid grid-cols-[52px_1fr] gap-2">
                    <dt className="text-gray-500">역할</dt>
                    <dd className="text-text-default">{r.purpose}</dd>
                  </div>
                  <div className="grid grid-cols-[52px_1fr] gap-2">
                    <dt className="text-gray-500">입력</dt>
                    <dd className="text-text-default">{r.inputs}</dd>
                  </div>
                  <div className="grid grid-cols-[52px_1fr] gap-2">
                    <dt className="text-gray-500">출력</dt>
                    <dd className="text-text-default">{r.outputs}</dd>
                  </div>
                  <div className="grid grid-cols-[52px_1fr] gap-2">
                    <dt className="text-gray-500">왜?</dt>
                    <dd className="text-text-muted">{r.why}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
