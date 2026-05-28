"use client";

export function DashboardHeader() {
  return (
    <header>
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
    </header>
  );
}
