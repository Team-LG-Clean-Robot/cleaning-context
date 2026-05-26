"use client";

import { useEffect, useRef } from "react";
import type { RoomId, RoomScore } from "@/lib/types";
import { ROOM_LABEL } from "@/lib/types";
import { MODE_BADGE } from "@/lib/colors";

type Props = {
  room: RoomScore;
  onClose: () => void;
};

export function RoomDetail({ room, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  const badge = MODE_BADGE[room.mode];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-[fadeIn_0.15s_ease]">
      <div
        ref={ref}
        className="bg-surface-base border border-border-default rounded-xl shadow-lg max-w-sm w-full mx-4 p-5 space-y-4 animate-[slideUp_0.2s_ease]"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[18px] font-bold text-text-default">
              {ROOM_LABEL[room.room_id]}
            </h3>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-medium ${badge.cls}`}>
              {badge.prefix}{badge.label}
            </span>
          </div>
          <div className="text-right">
            <div className="text-[28px] font-bold font-mono text-text-default">
              {room.final}
            </div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">점</div>
          </div>
        </div>

        {/* Score Breakdown */}
        {room.breakdown && room.breakdown.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
              점수 구성
            </div>
            <div className="space-y-1">
              {room.breakdown.map((b, i) => (
                <div key={i} className="flex justify-between text-[12px]">
                  <span className="text-text-muted">{b.label_ko}</span>
                  <span className={`font-mono font-medium ${b.delta >= 0 ? "text-text-default" : "text-gray-500"}`}>
                    {b.delta >= 0 ? "+" : ""}{b.delta}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-[12px] font-semibold border-t border-border-default pt-1 mt-1">
                <span>최종 점수</span>
                <span className="font-mono">{room.final}</span>
              </div>
            </div>
          </div>
        )}

        {/* 제외 사유 */}
        {room.exclusion_reason && (
          <div className="text-[12px] text-text-muted bg-surface-muted rounded-md p-2.5">
            <span className="font-medium">제외 사유:</span> {room.exclusion_reason}
          </div>
        )}

        {/* 닫기 */}
        <button
          onClick={onClose}
          className="w-full py-2 text-[13px] font-medium text-text-muted hover:text-text-default border border-border-default rounded-lg hover:bg-surface-muted transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
