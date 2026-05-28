"use client";

import { ThemeToggle } from "./ThemeToggle";

export function DashboardHeader() {
  return (
    <header className="space-y-4">
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

      {/* 두 축 ribbon */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span
          className="px-2.5 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-800 font-medium"
          title="IoT 멀티센서로 생활 맥락(요리·취침·날씨·손님)을 읽고, 청소 우선순위를 결정합니다."
        >
          🧭 맥락 인식
        </span>
        <span className="text-gray-400">+</span>
        <span
          className="px-2.5 py-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 font-medium"
          title="모든 추론은 디바이스(엣지)에서 끝나고, 클라우드로는 high-level event만 전송됩니다."
        >
          🛡 Privacy-on-Edge
        </span>
      </div>
    </header>
  );
}
