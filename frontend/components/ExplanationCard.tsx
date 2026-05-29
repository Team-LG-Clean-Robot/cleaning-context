"use client";
import type { RoomId, RoomScore, ScoreContribution, SimulateResponse } from "@/lib/types";
import { ROOM_LABEL } from "@/lib/types";

function BreakdownAxis({
  title, rows, sum,
}: { title: string; rows: ScoreContribution[]; sum: number }) {
  return (
    <div className="border border-border-default bg-surface-muted rounded-lg p-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider mb-1 text-text-muted">
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="text-[12px] text-gray-500 italic">해당 항목 없음</div>
      ) : (
        <table className="w-full text-[12px]">
          <tbody>
            {rows.map((c, i) => (
              <tr key={i} className="border-t border-border-default first:border-t-0">
                <td className="py-1 text-text-muted">{c.label_ko}</td>
                <td className="py-1 text-right font-mono text-text-default">
                  {c.delta >= 0 ? `+${c.delta}` : c.delta}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border-default font-semibold">
              <td className="py-1">소계</td>
              <td className="py-1 text-right font-mono">
                {sum >= 0 ? `+${sum}` : sum}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  user_returned: "사용자 귀가",
  user_left: "사용자 외출",
  cooking_done: "요리 완료",
  cooking_active: "요리 진행 중",
  pre_sleep_30min: "취침 30분 이내",
  pre_sleep_2h: "취침 2시간 이내",
  recent_shower: "샤워 직후",
  tv_watching: "TV 시청 중",
  rain: "비",
  guest_arriving_2h: "손님 방문 임박",
  guest_visit_recent: "최근 손님 방문",
  meal_prep: "식사 준비",
};

export function ExplanationCard({
  response,
  currentRoom,
  liveScores,
}: {
  response: SimulateResponse;
  currentRoom?: RoomId | null;
  liveScores?: RoomScore[];
}) {
  const scores = liveScores && liveScores.length ? liveScores : response.rooms;
  const ranked = [...scores].sort((a, b) => b.final - a.final);
  const top =
    (currentRoom ? scores.find((r) => r.room_id === currentRoom) : undefined) ??
    ranked.find((r) => r.mode !== "excluded") ??
    ranked[0];
  const excluded = ranked.filter((r) => r.mode === "excluded");

  return (
    <section className="p-5 relative">
      <div
        className="absolute top-5 bottom-5 left-0 w-1 bg-accent-500 rounded-r"
        aria-hidden
      />
      <div className="pl-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">AI 설명</h2>
          {response.fallback && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded
                             bg-surface-muted text-text-muted border border-border-default">
              폴백 모드
            </span>
          )}
        </div>
        <p className="text-[14px] leading-[1.7] text-text-default whitespace-pre-wrap">
          {response.explanation || "(설명 없음)"}
        </p>

        {top && (() => {
          const needs = top.breakdown.filter((c) => (c.axis ?? "need") === "need");
          const opps = top.breakdown.filter((c) => c.axis === "opportunity");
          const needSum = needs.reduce((s, c) => s + c.delta, 0);
          const oppSum = opps.reduce((s, c) => s + c.delta, 0);
          return (
            <details className="group">
              <summary
                className="cursor-pointer list-none bg-surface-base hover:bg-border-default/40
                           border border-border-default rounded-lg px-4 py-2
                           text-[13px] font-medium inline-flex items-center gap-1 select-none"
              >
                왜 {ROOM_LABEL[top.room_id]}?
                <span className="text-gray-500 group-open:hidden">▾</span>
                <span className="text-gray-500 hidden group-open:inline">▴</span>
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5">
                <BreakdownAxis title="Need · 얼마나 더러운가" rows={needs} sum={needSum} />
                <BreakdownAxis title="Opportunity · 지금 청소해도 되는가" rows={opps} sum={oppSum} />
              </div>
              <div className="flex justify-between items-baseline mt-2.5 pt-2 border-t border-border-default text-[12px] font-semibold">
                <span>최종 (Need + Opportunity)</span>
                <span className="font-mono text-text-default">{top.final}</span>
              </div>
            </details>
          );
        })()}

        {excluded.length > 0 && (
          <details className="group">
            <summary
              className="cursor-pointer list-none bg-surface-base hover:bg-border-default/40
                         border border-border-default rounded-lg px-4 py-2
                         text-[13px] font-medium inline-flex items-center gap-1 select-none"
            >
              왜 {excluded.length}개 공간을 제외?
              <span className="text-gray-500 group-open:hidden">▾</span>
              <span className="text-gray-500 hidden group-open:inline">▴</span>
            </summary>
            <ul className="text-[12px] text-text-muted space-y-1 mt-2.5 pl-1">
              {excluded.map((r) => (
                <li key={r.room_id}>
                  <span className="font-medium text-text-default">
                    {ROOM_LABEL[r.room_id]}
                  </span>
                  : {r.exclusion_reason ?? "사유 없음"}
                </li>
              ))}
            </ul>
          </details>
        )}

        {response.inferred_events && response.inferred_events.length > 0 && (
          <details className="group">
            <summary
              className="cursor-pointer list-none bg-surface-base hover:bg-border-default/40
                         border border-border-default rounded-lg px-4 py-2
                         text-[13px] font-medium inline-flex items-center gap-1 select-none"
            >
              센서 → 이벤트 추론 결과
              <span className="text-gray-500 group-open:hidden">▾</span>
              <span className="text-gray-500 hidden group-open:inline">▴</span>
            </summary>
            <div className="mt-2.5 space-y-1.5">
              {response.inferred_events.map((ev) => (
                <div key={ev.event_id} className="flex items-center gap-2 text-[12px]">
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                    ev.source === "rule"
                      ? "text-blue-700 bg-blue-50 border-blue-200"
                      : "text-purple-700 bg-purple-50 border-purple-200"
                  }`}>
                    {ev.source === "rule" ? "Rule" : "ML"}
                  </span>
                  <span className="text-text-default font-medium">
                    {EVENT_LABEL[ev.event_id] ?? ev.event_id}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        ev.source === "rule" ? "bg-blue-400" : "bg-purple-400"
                      }`}
                      style={{ width: `${Math.round(ev.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-text-muted shrink-0">
                    {(ev.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default text-[10px]">
          <span className="text-gray-500">
            응답 시간 {response.duration_ms}ms · {response.context_summary}
          </span>
        </div>
      </div>
    </section>
  );
}
