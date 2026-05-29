"use client";
import { useEffect, useState } from "react";
import type { SimulateResponse, EventMeta, RoomId } from "@/lib/types";
import { ROOM_LABEL } from "@/lib/types";
import type { SensorState } from "@/lib/sensor-mock";
import { getSensorStates } from "@/lib/sensor-mock";
import { SensorIcon } from "./SensorIcon";
import {
  AntennaIcon,
  ChartIcon,
  ChatIcon,
  ChipIcon,
  FlowIcon,
  GlobeIcon,
  ShieldIcon,
} from "./icons";

type Props = {
  response: SimulateResponse | null;
  scenarioId: string | null;
  events?: EventMeta[];
};

const STEP_DELAY = 600;

function useStaggeredReveal(response: SimulateResponse | null): number {
  const [visibleStep, setVisibleStep] = useState(-1);
  const scenarioId = response?.scenario_id ?? null;

  useEffect(() => {
    setVisibleStep(-1);
    if (!scenarioId) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < 5; i++) {
      timers.push(setTimeout(() => setVisibleStep(i), STEP_DELAY * (i + 1)));
    }
    return () => timers.forEach(clearTimeout);
  }, [scenarioId]);

  return visibleStep;
}

function StepCard({
  step,
  icon,
  title,
  visible,
  children,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  visible: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative border rounded-xl p-4 transition-all duration-500 ${
        visible
          ? "bg-white border-border-default shadow-sm opacity-100 translate-y-0"
          : "bg-surface-muted border-transparent opacity-0 translate-y-4"
      }`}
    >
      {/* connector line */}
      {step > 0 && (
        <div className={`absolute -top-4 left-1/2 w-px h-4 transition-colors duration-500 ${
          visible ? "bg-accent-500" : "bg-transparent"
        }`} />
      )}
      <div className="flex items-center gap-2 mb-2.5">
        <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors duration-500 ${
          visible ? "bg-accent-500 text-white" : "bg-gray-200 text-gray-400"
        }`}>{step + 1}</span>
        <span className="text-text-muted">{icon}</span>
        <span className="text-[13px] font-semibold text-text-default">{title}</span>
      </div>
      <div className={`transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
        {children}
      </div>
    </div>
  );
}

function Tag({ children, color = "gray" }: { children: React.ReactNode; color?: "blue" | "purple" | "green" | "amber" | "gray" | "red" }) {
  const cls: Record<string, string> = {
    blue: "text-blue-700 bg-blue-50 border-blue-200",
    purple: "text-purple-700 bg-purple-50 border-purple-200",
    green: "text-emerald-700 bg-emerald-50 border-emerald-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    gray: "text-gray-600 bg-gray-50 border-gray-200",
    red: "text-red-600 bg-red-50 border-red-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${cls[color]}`}>
      {children}
    </span>
  );
}

export function PipelinePanel({ response, scenarioId, events }: Props) {
  const visibleStep = useStaggeredReveal(response);
  const sensors: SensorState[] = getSensorStates(scenarioId);
  const activeSensors = sensors.filter((s) => s.active);

  // event_id → 한국어 이름 (없으면 방 이름, 그것도 없으면 원본 id)
  const eventLabel = (id: string): string => {
    const meta = events?.find((e) => e.id === id);
    if (meta) return meta.name_ko;
    if (id in ROOM_LABEL) return ROOM_LABEL[id as RoomId];
    return id;
  };

  if (!response) {
    return (
      <section className="border-2 border-dashed border-border-default rounded-xl p-8 text-center text-gray-500">
        <FlowIcon className="w-7 h-7 mx-auto mb-2 text-gray-400" />
        <p className="text-[13px] text-text-muted">
          시나리오를 선택하면 처리 흐름이 단계별로 나타납니다.
        </p>
      </section>
    );
  }

  const sorted = [...response.rooms].sort((a, b) => b.final - a.final);
  const topRoom = sorted[0];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">데이터 흐름 · 센서에서 청소 결정까지</span>
        <div className="flex-1 h-px bg-border-default" />
      </div>

      {/* Step 1: 센서 입력 */}
      <StepCard step={0} icon={<AntennaIcon className="w-4 h-4" />} title="센서 — 집 안 상황 감지" visible={visibleStep >= 0}>
        <div className="flex flex-wrap gap-1.5">
          {activeSensors.length > 0 ? activeSensors.map((s) => (
            <Tag key={s.id} color="blue">
              <SensorIcon sensorId={s.id} className="w-3 h-3" /> {s.name_ko}: {s.label}
            </Tag>
          )) : (
            <span className="text-[11px] text-text-muted">신호를 보내는 센서 없음</span>
          )}
        </div>
        {activeSensors.length > 0 && (
          <p className="text-[10px] text-text-muted mt-2">
            도어락·인덕션·냉장고 등 센서 12종 중 {activeSensors.length}개가 신호를 보냄
          </p>
        )}
      </StepCard>

      {/* Step 2: ML 사용자 위치 추정 + 룰 맥락 (박주상 v3) */}
      <StepCard step={1} icon={<ChipIcon className="w-4 h-4" />} title="추론 — 지금 무슨 상황인지 판별" visible={visibleStep >= 1}>
        <div className="flex flex-wrap gap-1.5">
          {response.inferred_events.map((ev) => (
            <Tag key={ev.event_id} color={ev.source === "ml" ? "purple" : "blue"}>
              {ev.source === "ml" ? "AI" : "규칙"} {eventLabel(ev.event_id)}
              <span className="font-mono">{(ev.confidence * 100).toFixed(0)}%</span>
            </Tag>
          ))}
        </div>
        <p className="text-[10px] text-text-muted mt-2">
          사용자 위치는 AI가 추정하고, 그 외 상황은 정해진 규칙으로 판별합니다
        </p>
      </StepCard>

      {/* Privacy-on-Edge 경계선 — 여기까지가 디바이스, 이후는 high-level event */}
      <div className="relative py-1 my-1">
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-emerald-300" />
        <div className="relative flex justify-center">
          <span className="inline-flex items-center gap-1 bg-surface-base px-2 text-[10px] font-medium text-emerald-700 tracking-wider">
            <ShieldIcon className="w-3 h-3" />
            여기까지 디바이스 안에서 처리 · 센서 원본은 나가지 않고 해석된 상황만 클라우드로
          </span>
        </div>
      </div>

      {/* Step 3: 맥락 종합 */}
      <StepCard step={2} icon={<GlobeIcon className="w-4 h-4" />} title="상황 요약 — 한 문장으로 정리" visible={visibleStep >= 2}>
        <p className="text-[12px] text-text-default leading-relaxed">
          {response.context_summary}
        </p>
      </StepCard>

      {/* Step 4: 점수 계산 */}
      <StepCard step={3} icon={<ChartIcon className="w-4 h-4" />} title="점수 계산 — 규칙대로 방별 우선순위" visible={visibleStep >= 3}>
        <div className="space-y-2">
          {sorted.map((r, i) => {
            const pct = Math.max(0, Math.min(100, (r.final / (topRoom?.final || 1)) * 100));
            return (
              <div key={r.room_id} className="flex items-center gap-2">
                <span className="text-[11px] font-medium w-[48px] shrink-0 text-right">
                  {ROOM_LABEL[r.room_id]}
                </span>
                <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden relative">
                  {r.mode === "excluded" ? (
                    <div className="h-full flex items-center px-2">
                      <span className="text-[10px] text-gray-400">제외</span>
                    </div>
                  ) : (
                    <div
                      className="h-full rounded transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: i === 0
                          ? "linear-gradient(90deg, #3b82f6, #1d4ed8)"
                          : `rgba(59,130,246,${0.7 - i * 0.12})`,
                        transitionDelay: `${i * 100}ms`,
                      }}
                    />
                  )}
                </div>
                <span className="text-[11px] font-mono font-bold w-[32px] shrink-0 text-right">
                  {r.mode === "excluded" ? (
                    <span className="text-gray-400">{r.final}</span>
                  ) : r.final}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-text-muted mt-2">
          기본 점수 + 상황별 가감 → 최종 점수 · 정해진 규칙대로 계산 (AI 개입 없음)
        </p>
      </StepCard>

      {/* Step 5: AI 설명 */}
      <StepCard step={4} icon={<ChatIcon className="w-4 h-4" />} title="AI 설명 — 점수를 말로 풀이" visible={visibleStep >= 4}>
        <p className="text-[12px] text-text-default leading-relaxed">
          {response.explanation}
        </p>
        <p className="text-[10px] text-text-muted mt-2">
          점수는 규칙으로 일관되게 계산하고, 그 결과를 AI가 말로 설명합니다
        </p>
      </StepCard>
    </section>
  );
}
