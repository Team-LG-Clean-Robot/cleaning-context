"use client";
import type { SimulateResponse } from "@/lib/types";
import { ROOM_LABEL } from "@/lib/types";

export function ExplanationCard({ response }: { response: SimulateResponse }) {
  const top = response.rooms[0];
  const excluded = response.rooms.filter((r) => r.mode === "excluded");

  return (
    <section className="bg-white border border-line rounded-xl p-5 shadow-sm relative">
      <div
        className="absolute top-5 bottom-5 left-0 w-1 bg-gold rounded-r"
        aria-hidden
      />
      <div className="pl-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">AI 설명</h2>
          {response.fallback && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded
                             bg-orange-50 text-orange-700 border border-orange-700/30">
              폴백 모드
            </span>
          )}
        </div>
        <p className="text-[14px] leading-[1.7] text-ink whitespace-pre-wrap">
          {response.explanation || "(설명 없음)"}
        </p>

        {top && (
          <details className="group">
            <summary
              className="cursor-pointer list-none bg-paper hover:bg-line/40
                         border border-line rounded-lg px-4 py-2
                         text-[13px] font-medium inline-flex items-center gap-1 select-none"
            >
              왜 {ROOM_LABEL[top.room_id]}부터?
              <span className="text-ink-3 group-open:hidden">▾</span>
              <span className="text-ink-3 hidden group-open:inline">▴</span>
            </summary>
            <table className="w-full text-[12px] mt-2.5">
              <tbody>
                {top.breakdown.map((c, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1.5 text-ink-2">{c.label_ko}</td>
                    <td className="py-1.5 text-right font-mono text-ink">
                      {c.delta >= 0 ? `+${c.delta}` : c.delta}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line font-semibold">
                  <td className="py-1.5">최종</td>
                  <td className="py-1.5 text-right font-mono">{top.final}</td>
                </tr>
              </tbody>
            </table>
          </details>
        )}

        {excluded.length > 0 && (
          <details className="group">
            <summary
              className="cursor-pointer list-none bg-paper hover:bg-line/40
                         border border-line rounded-lg px-4 py-2
                         text-[13px] font-medium inline-flex items-center gap-1 select-none"
            >
              왜 {excluded.length}개 공간을 제외?
              <span className="text-ink-3 group-open:hidden">▾</span>
              <span className="text-ink-3 hidden group-open:inline">▴</span>
            </summary>
            <ul className="text-[12px] text-ink-2 space-y-1 mt-2.5 pl-1">
              {excluded.map((r) => (
                <li key={r.room_id}>
                  <span className="font-medium text-ink">
                    {ROOM_LABEL[r.room_id]}
                  </span>
                  : {r.exclusion_reason ?? "사유 없음"}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="text-[10px] text-ink-3 pt-2 border-t border-line">
          응답 시간 {response.duration_ms}ms · {response.context_summary}
        </div>
      </div>
    </section>
  );
}
