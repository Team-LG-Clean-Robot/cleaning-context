"use client";
import { useState } from "react";

const LAYERS = [
  { num: "01", ko: "공간 이해", en: "Spatial" },
  { num: "02", ko: "사용자 행동", en: "Behavioral" },
  { num: "03", ko: "상황 추론", en: "Context" },
  { num: "04", ko: "의사결정", en: "Decision" },
  { num: "05", ko: "이유 설명", en: "Explainable" },
];

const ROLES = [
  {
    title: "Rule-based Scoring",
    purpose: "결정론적 점수 계산",
    inputs: "이벤트 + 공간 상태 + 시간 + 날씨",
    outputs: "공간별 priority score",
    why: "일관성·재현성·디버깅 가능",
  },
  {
    title: "LLM Explainer",
    purpose: "점수표를 자연어로 해석",
    inputs: "점수표 + 컨텍스트 요약",
    outputs: "왜 이 공간을 먼저/제외하는지 설명",
    why: "투명성·신뢰감 — 점수는 직접 계산하지 않음",
  },
];

export function MethodologyCard() {
  const [open, setOpen] = useState(false);
  return (
    <section className="bg-white border border-line rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[14px] text-ink leading-relaxed max-w-[72ch]">
          공간·행동·맥락을 점수로 환산하고{" "}
          <span className="text-gold font-medium">(Rule-based)</span>, 그 이유를
          자연어로 설명합니다{" "}
          <span className="text-gold font-medium">(LLM)</span>. 점수 계산과 설명
          생성이 분리되어 있어 "왜 이렇게 청소했는지" 100% 추적 가능합니다.
        </p>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="shrink-0 bg-paper hover:bg-line/40 border border-line rounded-md px-3 py-1.5 text-[13px] font-medium transition"
        >
          {open ? "접기" : "어떻게 동작하나?"}
        </button>
      </div>

      {open && (
        <div className="mt-6 space-y-5">
          <svg
            viewBox="0 0 880 130"
            className="w-full h-auto"
            role="img"
            aria-label="5단계 처리 흐름: 공간 이해, 사용자 행동, 상황 추론, 의사결정, 이유 설명"
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
            {LAYERS.map((L, i) => {
              const x = i * 176;
              return (
                <g key={L.num} transform={`translate(${x}, 16)`}>
                  <rect
                    width={160}
                    height={96}
                    rx={10}
                    fill="#FAF7F2"
                    stroke="#E5E0D6"
                    strokeWidth={1.5}
                  />
                  <text
                    x={12}
                    y={22}
                    fill="#8B6628"
                    style={{
                      font: '600 11px var(--font-mono)',
                    }}
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
          </svg>

          <div className="grid grid-cols-2 gap-0 border border-line rounded-lg overflow-hidden">
            {ROLES.map((r, i) => (
              <div
                key={r.title}
                className={`p-4 ${i === 0 ? "border-r border-line" : ""}`}
              >
                <div className="text-[11px] uppercase tracking-wider text-gold font-semibold mb-2">
                  {r.title}
                </div>
                <dl className="space-y-1.5 text-[12px]">
                  <div className="grid grid-cols-[64px_1fr] gap-2">
                    <dt className="text-ink-3">역할</dt>
                    <dd className="text-ink">{r.purpose}</dd>
                  </div>
                  <div className="grid grid-cols-[64px_1fr] gap-2">
                    <dt className="text-ink-3">입력</dt>
                    <dd className="text-ink">{r.inputs}</dd>
                  </div>
                  <div className="grid grid-cols-[64px_1fr] gap-2">
                    <dt className="text-ink-3">출력</dt>
                    <dd className="text-ink">{r.outputs}</dd>
                  </div>
                  <div className="grid grid-cols-[64px_1fr] gap-2">
                    <dt className="text-ink-3">왜?</dt>
                    <dd className="text-ink-2">{r.why}</dd>
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
