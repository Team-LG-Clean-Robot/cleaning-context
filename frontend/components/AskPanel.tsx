"use client";
import { useState } from "react";
import { askQuestion } from "@/lib/api";
import type { SimulateResponse } from "@/lib/types";

type Turn = { question: string; answer: string; fallback: boolean };

type Props = { response: SimulateResponse | null };

const GROUNDED_SUGGESTIONS = [
  "왜 이 방을 가장 먼저 청소해?",
  "이 점수는 어떤 센서들이 영향을 줬어?",
  "지금 청소 안 해도 되는 곳은 어디야?",
];

const GENERAL_SUGGESTIONS = [
  "이 시뮬레이터는 어떻게 동작해?",
  "Rule-based랑 LLM은 어떻게 나눠져 있어?",
  "어떤 시나리오가 있어?",
];

export function AskPanel({ response }: Props) {
  const grounded = response !== null;
  const SUGGESTIONS = grounded ? GROUNDED_SUGGESTIONS : GENERAL_SUGGESTIONS;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(q: string) {
    const question = q.trim();
    if (!question || loading) return;
    setDraft("");
    setError(null);
    setLoading(true);
    setTurns((t) => [...t, { question, answer: "", fallback: false }]);
    try {
      const res = await askQuestion({
        context_summary: response?.context_summary ?? "",
        rooms: response?.rooms ?? [],
        question,
      });
      setTurns((t) => {
        const next = t.slice();
        next[next.length - 1] = {
          question,
          answer: res.answer,
          fallback: res.fallback,
        };
        return next;
      });
    } catch (e) {
      setTurns((t) => t.slice(0, -1));
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-label="AI 후속 질문"
      className="p-5 space-y-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[16px] font-semibold text-text-default">
          {grounded ? "이 결과에 대해 묻기" : "AI 어시스턴트"}
        </h2>
        <span className="text-[11px] text-gray-500">
          {grounded
            ? "현재 시뮬레이션 결과를 근거로 답변합니다"
            : "프로젝트·시나리오 전반에 대해 질문하세요"}
        </span>
      </div>

      {turns.length === 0 && !loading && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="text-[12px] px-2.5 py-1 rounded-full bg-surface-muted border border-border-default text-text-default hover:bg-white transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {turns.length > 0 && (
        <ol className="space-y-3">
          {turns.map((t, i) => (
            <li key={i} className="space-y-1.5">
              <div className="text-[13px] font-medium text-text-default">
                <span className="mr-1.5 text-gray-500">Q.</span>
                {t.question}
              </div>
              <div className="text-[13px] leading-relaxed text-text-muted pl-5 border-l-2 border-border-default">
                {t.answer ? (
                  <>
                    {t.fallback && (
                      <span className="inline-block mr-1.5 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-muted border border-border-default text-text-muted">
                        폴백
                      </span>
                    )}
                    {t.answer}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-gray-500">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" />
                    답변 생성 중…
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {error && (
        <div className="text-[12px] text-text-default bg-surface-muted border-l-4 border-l-text-default border border-border-default rounded-md p-2">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex gap-2 pt-1"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={200}
          placeholder={
            grounded
              ? "예: 왜 침실은 청소를 안 해?"
              : "예: Rule-based랑 LLM 어떻게 나눠져 있어?"
          }
          disabled={loading}
          className="flex-1 px-3 py-2 text-[13px] bg-white border border-border-default rounded-md focus:outline-none focus:ring-2 focus:ring-text-default/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !draft.trim()}
          className="px-4 py-2 text-[13px] font-medium bg-action-primary text-white rounded-md hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          보내기
        </button>
      </form>
    </section>
  );
}
