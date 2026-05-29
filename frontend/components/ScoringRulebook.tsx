"use client";

import { useEffect, useRef } from "react";

type Props = { onClose: () => void };

export function ScoringRulebook({ onClose }: Props) {
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-[fadeIn_0.15s_ease]">
      <div
        ref={ref}
        className="bg-surface-base border border-border-default rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto p-6 space-y-5 animate-[slideUp_0.2s_ease]"
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 sticky top-0 bg-surface-base -mt-2 pt-2 pb-2 border-b border-border-default">
          <div>
            <h3 className="text-[18px] font-bold text-text-default">점수 설명서</h3>
            <p className="text-[12px] text-text-muted mt-0.5">
              각 항목의 점수가 어떻게 결정되는가
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[18px] leading-none text-text-muted hover:text-text-default px-2 -mr-2"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {/* 1. 한 줄 산식 */}
        <Section title="1. 한 줄 산식">
          <div className="bg-surface-muted border border-border-default rounded-md p-3 font-mono text-[13px] text-text-default leading-relaxed">
            final = <strong>Need</strong> (얼마나 더러운가) + <strong>Opportunity</strong> (지금 청소해도 되는가)
          </div>
        </Section>

        {/* 2. Base score */}
        <Section title="2. Base score — 방 자체의 청소 우선도">
          <Table
            headers={["방", "점수", "근거"]}
            rows={[
              ["주방", "28", "위생 민감 + 조리 오염 잦음 — 최상위"],
              ["현관", "22", "외부 출입 통로 — 흙·물기 유입 쉬움"],
              ["거실", "20", "가족 공용 공간 — 일상 활동 집중"],
              ["욕실", "18", "습기·물때 — 정기 관리 필요"],
              ["침실", "12", "정적 공간 — 먼지 누적 느림"],
            ]}
          />
        </Section>

        {/* 3. Need 이벤트 */}
        <Section title="3. Need 측 이벤트 — 방을 더럽게 하는 신호">
          <Table
            headers={["이벤트", "영향 방 · delta", "근거"]}
            rows={[
              ["rain", "현관 +25 / 거실 +5", "비 묻은 신발·우산 — 현관 직접, 거실 부수"],
              ["user_returned", "현관 +15 / 거실 +5", "외부에서 방금 진입"],
              ["cooking_done", "주방 +35 / 거실 +5", "요리 직후 음식 부스러기·기름"],
              ["cooking_active", "주방 −40 / 거실 +15", "조리 중 — 주방 회피, 동선 거실로"],
              ["recent_shower", "욕실 +25", "습기·머리카락 직접"],
              ["package_delivery", "현관 +35 / 거실 +10", "배송 출입 — 현관 동선 오염"],
            ]}
          />
        </Section>

        {/* 4. Opportunity 신호 */}
        <Section title="4. Opportunity 측 신호 — 시점 적합성">
          <Table
            headers={["신호", "영향", "근거"]}
            rows={[
              ["guest_arriving_2h", "거실 +30 / 현관 +15 / 욕실 +15 / 침실 −5", "캘린더 — 사전 정리 invitation, 침실은 비공개"],
              ["pre_sleep_30min", "침실 −40 / 욕실 +15", "취침 임박 — 침실 소음 회피"],
              ["pre_sleep_2h", "침실 −20 / 거실 +5", "취침 전 거실 정리는 권장"],
              ["user_occupancy", "사용자 위치 방 −20", "사용자 위치 추정 → 방해 회피 (지연)"],
              ["noise_sleep_extra", "−10 (조건부)", "취침 임박 + 소음 민감 방(침실)"],
            ]}
          />
        </Section>

        {/* 5. 값 결정 원리 */}
        <Section title="5. 값 결정 원리">
          <ul className="text-[13px] text-text-default leading-relaxed space-y-1.5 pl-4 list-disc marker:text-text-muted">
            <li>강한 신호 (cooking_done, pre_sleep_30min): <strong>30~40</strong> — base_score 단위와 동급</li>
            <li>약한·부수 신호 (rain 거실, user_returned 거실): <strong>5~15</strong></li>
            <li>modifier (user_occupancy, noise_sleep): <strong>−10 ~ −20</strong></li>
          </ul>
        </Section>

        {/* 6. 확장성 */}
        <Section title="6. 확장성 — 30분 내 새 이벤트 추가">
          <p className="text-[13px] text-text-default leading-relaxed">
            모든 점수 값은 코드가 아닌 JSON 데이터 파일에 격리됩니다 (
            <code className="font-mono text-[12px] px-1 py-0.5 bg-surface-muted border border-border-default rounded">
              rooms.json
            </code>
            ·
            <code className="font-mono text-[12px] px-1 py-0.5 bg-surface-muted border border-border-default rounded">
              events.json
            </code>
            ·
            <code className="font-mono text-[12px] px-1 py-0.5 bg-surface-muted border border-border-default rounded">
              scoring_rules.json
            </code>
            ). 새로운 IoT 이벤트나 가전을 추가해도 코드 분기 없이 데이터만 수정해서 반영 — 학습 기간 단축·튜닝 비용 최소화가 KPI.
          </p>
        </Section>

        <div className="pt-2 border-t border-border-default">
          <button
            onClick={onClose}
            className="w-full py-2 text-[13px] font-medium text-text-muted hover:text-text-default border border-border-default rounded-lg hover:bg-surface-muted transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-[14px] font-semibold text-text-default">{title}</h4>
      {children}
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border-default">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-1.5 px-2 text-text-muted font-semibold uppercase tracking-wider text-[10px]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border-default last:border-b-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`py-1.5 px-2 align-top ${j === 0 ? "font-mono text-text-default" : "text-text-muted"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
