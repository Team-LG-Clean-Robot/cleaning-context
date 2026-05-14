import { MethodologyCard } from "@/components/MethodologyCard";
import { Simulator } from "@/components/Simulator";

export default function Page() {
  return (
    <main className="max-w-[1440px] mx-auto px-8 py-8 space-y-6">
      <header className="flex items-start gap-4">
        <div className="w-1 h-7 bg-lg-red mt-1.5" aria-hidden />
        <div>
          <h1 className="text-[28px] font-bold leading-tight">
            생활 맥락 로봇청소기 시뮬레이터
          </h1>
          <p className="text-[14px] text-ink-2 mt-1 max-w-[64ch]">
            로봇청소기가 시간·날씨·이벤트를 종합해 어디를·언제·어떻게 청소할지
            결정하고, 그 이유를 자연어로 설명합니다.
          </p>
          <p className="text-[12px] text-ink-3 mt-1">
            럭키 금성 · LG전자 가전 멘토링 트랙 · AI Intensive Project
          </p>
        </div>
      </header>
      <MethodologyCard />
      <Simulator />
    </main>
  );
}
