"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomScore, ScoreContribution } from "@/lib/types";
import { ROOM_LABEL } from "@/lib/types";
import { MODE_BADGE } from "@/lib/colors";
import { ScoringRulebook } from "./ScoringRulebook";

function AxisBlock({
  title, rows, sum,
}: { title: string; rows: ScoreContribution[]; sum: number }) {
  return (
    <div className="border border-border-default bg-surface-muted rounded-lg p-2.5 space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{title}</div>
      {rows.length === 0 ? (
        <div className="text-[11px] text-gray-500 italic">해당 항목 없음</div>
      ) : (
        rows.map((b, i) => (
          <div key={i} className="flex justify-between text-[12px]">
            <span className="text-text-muted">{b.label_ko}</span>
            <span className={`font-mono font-medium ${b.delta >= 0 ? "text-text-default" : "text-gray-500"}`}>
              {b.delta >= 0 ? "+" : ""}{b.delta}
            </span>
          </div>
        ))
      )}
      <div className="flex justify-between text-[11px] font-semibold border-t border-border-default pt-1">
        <span>소계</span>
        <span className="font-mono">{sum >= 0 ? `+${sum}` : sum}</span>
      </div>
    </div>
  );
}

type Props = {
  room: RoomScore;
  onClose: () => void;
};

export function RoomDetail({ room, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showRulebook, setShowRulebook] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showRulebook) setShowRulebook(false);
        else onClose();
      }
    }
    function handleClick(e: MouseEvent) {
      if (showRulebook) return; // rulebook이 자체 outside-click 처리
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose, showRulebook]);

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

        {/* Score Breakdown — Need / Opportunity 두 축 */}
        {room.breakdown && room.breakdown.length > 0 && (() => {
          const needs = room.breakdown.filter((c) => (c.axis ?? "need") === "need");
          const opps = room.breakdown.filter((c) => c.axis === "opportunity");
          const needSum = needs.reduce((s, c) => s + c.delta, 0);
          const oppSum = opps.reduce((s, c) => s + c.delta, 0);
          return (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                점수 구성 — Need × Opportunity
              </div>
              <div className="space-y-2">
                <AxisBlock title="Need · 얼마나 더러운가" rows={needs} sum={needSum} />
                <AxisBlock title="Opportunity · 지금 청소해도 되는가" rows={opps} sum={oppSum} />
              </div>
              <div className="flex justify-between text-[13px] font-semibold border-t border-border-default pt-2">
                <span>최종 (Need + Opportunity)</span>
                <span className="font-mono">{room.final}</span>
              </div>
            </div>
          );
        })()}

        {/* 제외 사유 */}
        {room.exclusion_reason && (
          <div className="text-[12px] text-text-muted bg-surface-muted rounded-md p-2.5">
            <span className="font-medium">제외 사유:</span> {room.exclusion_reason}
          </div>
        )}

        {/* 점수 설명서 */}
        <button
          onClick={() => setShowRulebook(true)}
          className="w-full py-2 text-[13px] font-medium text-text-default bg-surface-muted hover:bg-border-default/40 border border-border-default rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <span aria-hidden>📖</span>
          점수 설명서
        </button>

        {/* 닫기 */}
        <button
          onClick={onClose}
          className="w-full py-2 text-[13px] font-medium text-text-muted hover:text-text-default border border-border-default rounded-lg hover:bg-surface-muted transition-colors"
        >
          닫기
        </button>
      </div>
      {showRulebook && <ScoringRulebook onClose={() => setShowRulebook(false)} />}
    </div>
  );
}
