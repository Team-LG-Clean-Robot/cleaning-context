"use client";

import { useEffect, useRef } from "react";
import type { TimelineKeyframe } from "@/lib/types";

type Props = {
  currentMinute: number;
  currentTimeStr: string;
  playing: boolean;
  speed: 1 | 2 | 4;
  prefetchStatus: "idle" | "loading" | "ready" | "error";
  prefetchProgress: number;
  prefetchTotal: number;
  keyframes: TimelineKeyframe[];
  activeKeyframeIndex: number;
  onTogglePlay: () => void;
  onSpeedChange: (s: 1 | 2 | 4) => void;
  onSeek: (minute: number) => void;
};

const SPEEDS: (1 | 2 | 4)[] = [1, 2, 4];

export function TimelinePanel({
  currentMinute,
  currentTimeStr,
  playing,
  speed,
  prefetchStatus,
  prefetchProgress,
  prefetchTotal,
  keyframes,
  activeKeyframeIndex,
  onTogglePlay,
  onSpeedChange,
  onSeek,
}: Props) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current?.children[activeKeyframeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeKeyframeIndex]);

  const minStart = keyframes[0].minuteOfDay;
  const minEnd = keyframes[keyframes.length - 1].minuteOfDay;

  if (prefetchStatus === "idle" || (prefetchStatus === "loading" && prefetchProgress < 2)) {
    return (
      <section className="bg-white border border-border-default rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="text-[14px] font-semibold">하루 시뮬레이션 준비 중</h2>
        <div className="space-y-2">
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-accent-500 rounded-full transition-all duration-300"
              style={{ width: `${(prefetchProgress / prefetchTotal) * 100}%` }}
            />
          </div>
          <p className="text-[12px] text-text-muted">
            시나리오 계산 중... ({prefetchProgress}/{prefetchTotal})
          </p>
        </div>
      </section>
    );
  }

  if (prefetchStatus === "error") {
    return (
      <section className="bg-white border border-red-200 rounded-xl p-5 shadow-sm">
        <p className="text-[13px] text-red-600">시나리오 로딩 실패. 백엔드 연결을 확인하세요.</p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-border-default rounded-xl p-5 shadow-sm space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="w-10 h-10 flex items-center justify-center rounded-lg
                     bg-accent-500 text-white hover:bg-accent-600
                     transition-colors text-[18px]"
          aria-label={playing ? "일시정지" : "재생"}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <span className="font-mono text-[28px] font-bold text-text-default tabular-nums tracking-tight min-w-[5ch]">
          {currentTimeStr}
        </span>
        <div className="flex gap-1 ml-auto">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                speed === s
                  ? "bg-accent-500 text-white border-accent-500"
                  : "bg-surface-base text-text-muted border-border-default hover:bg-border-default/40"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Loading badge */}
      {prefetchStatus === "loading" && prefetchProgress < prefetchTotal && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] text-amber-700">
            추가 시나리오 로딩 중 ({prefetchProgress}/{prefetchTotal})
          </span>
        </div>
      )}

      {/* Slider */}
      <div className="space-y-1">
        <div className="relative">
          <input
            type="range"
            min={minStart}
            max={minEnd}
            step={1}
            value={Math.min(currentMinute, minEnd)}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-accent-500
                       [&::-webkit-slider-thumb]:shadow-md
                       [&::-webkit-slider-thumb]:cursor-pointer"
          />
          {/* Keyframe markers */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none">
            {keyframes.map((kf, i) => {
              const pct = ((kf.minuteOfDay - minStart) / (minEnd - minStart)) * 100;
              return (
                <div
                  key={i}
                  className={`absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                    i <= activeKeyframeIndex ? "bg-accent-500" : "bg-gray-300"
                  }`}
                  style={{ left: `${pct}%`, top: "50%" }}
                />
              );
            })}
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-text-muted">
          <span>{keyframes[0].time}</span>
          <span>{keyframes[keyframes.length - 1].time}</span>
        </div>
      </div>

      {/* Event Log */}
      <div ref={logRef} className="max-h-[320px] overflow-y-auto space-y-1 pr-1">
        {keyframes.map((kf, i) => {
          const isActive = i === activeKeyframeIndex;
          const isPast = i < activeKeyframeIndex;
          return (
            <button
              type="button"
              key={i}
              onClick={() => onSeek(kf.minuteOfDay)}
              className={`w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-lg
                         transition-all duration-200 border ${
                isActive
                  ? "bg-accent-500/5 border-accent-500/30 shadow-sm"
                  : isPast
                    ? "bg-surface-base border-transparent opacity-60"
                    : "bg-surface-muted border-transparent opacity-40"
              }`}
            >
              <span
                className={`shrink-0 w-[52px] font-mono text-[11px] font-medium pt-0.5 ${
                  isActive ? "text-accent-500" : "text-text-muted"
                }`}
              >
                {kf.time}
              </span>
              <span className="text-[14px] shrink-0 pt-px">{kf.icon}</span>
              <div className="min-w-0 flex-1">
                <div className={`text-[12px] font-medium ${isActive ? "text-text-default" : "text-text-muted"}`}>
                  {kf.description}
                </div>
                <div className="text-[11px] text-text-muted mt-0.5 truncate">
                  🤖 {kf.robotAction}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
