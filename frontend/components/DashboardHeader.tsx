"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

type HealthData = {
  status: string;
  scenarios_loaded: number;
  inference_rules_loaded: number;
  dataset_validation?: {
    accuracy: number;
    segments: number;
    mapped_rules: number;
    top_f1: Record<string, number>;
  } | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function DashboardHeader() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  const v = health?.dataset_validation;

  return (
    <header className="space-y-4">
      {/* 상단 바 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/robot-vacuum.png"
            alt=""
            aria-hidden
            className="w-16 h-13 object-contain shrink-0 select-none"
          />
          <div>
            <h1 className="text-[24px] sm:text-[28px] font-bold leading-tight">
              생활 맥락 로봇청소기
            </h1>
            <p className="text-[12px] text-text-muted mt-0.5">
              럭키 금성 · LG전자 가전 멘토링 트랙
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* 상태 바 */}
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        {/* API 상태 */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border-default bg-surface-base">
          <span
            className={`w-2 h-2 rounded-full ${
              health?.status === "ok"
                ? "bg-[oklch(75%_0.15_145)] shadow-[0_0_4px_oklch(75%_0.15_145)]"
                : "bg-gray-400 animate-pulse"
            }`}
          />
          <span className="text-text-muted font-medium">
            {health?.status === "ok" ? "서비스 정상" : "연결 중..."}
          </span>
        </div>

        {/* 시나리오 수 */}
        {health && (
          <div className="px-2.5 py-1.5 rounded-md border border-border-default bg-surface-base text-text-muted">
            시나리오 <span className="font-semibold text-text-default">{health.scenarios_loaded}</span>종
            {" · "}추론 규칙 <span className="font-semibold text-text-default">{health.inference_rules_loaded}</span>개
          </div>
        )}

        {/* CASAS 검증 배지 */}
        {v && (
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[oklch(75%_0.15_145)]/30 bg-surface-base hover:bg-surface-muted transition-colors"
          >
            <span className="text-[oklch(65%_0.12_145)] font-semibold">✓</span>
            <span className="text-text-muted">
              CASAS 검증{" "}
              <span className="font-semibold text-text-default">
                {(v.accuracy * 100).toFixed(1)}%
              </span>
            </span>
            <span className="text-gray-400">{open ? "▲" : "▼"}</span>
          </button>
        )}
      </div>

      {/* CASAS 검증 상세 (펼침) */}
      {open && v && (
        <div className="border border-border-default rounded-lg p-4 bg-surface-base text-[12px] space-y-2 animate-[fadeIn_0.2s_ease]">
          <div className="font-semibold text-text-default">
            공개 데이터셋 검증 결과
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-text-muted">
            <div>
              <div className="text-[10px] uppercase tracking-wider">정확도</div>
              <div className="text-[18px] font-bold text-text-default">
                {(v.accuracy * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider">평가 구간</div>
              <div className="text-[18px] font-bold text-text-default">
                {v.segments.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider">매핑 규칙</div>
              <div className="text-[18px] font-bold text-text-default">
                {v.mapped_rules}/13
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider">Top F1</div>
              <div className="space-y-0.5 mt-1">
                {Object.entries(v.top_f1).map(([k, f1]) => (
                  <div key={k} className="flex justify-between">
                    <span>{k.replace("user_", "").replace("cooking_", "cook_")}</span>
                    <span className="font-mono font-semibold text-text-default">{f1.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 pt-1 border-t border-border-default">
            출처: CASAS hh106 (Washington State Univ.) · CC BY 4.0 · 202,546 레코드
          </div>
        </div>
      )}
    </header>
  );
}
