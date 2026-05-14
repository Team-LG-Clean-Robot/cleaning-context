"use client";
import { useEffect, useRef, useState } from "react";
import {
  RequestSequencer,
  fetchEvents,
  fetchScenarios,
  simulateCustom,
  simulatePreset,
} from "@/lib/api";
import type {
  CustomRequest,
  EventMeta,
  ScenarioMeta,
  SimulateResponse,
} from "@/lib/types";
import { CustomModePanel } from "./CustomModePanel";
import { ExplanationCard } from "./ExplanationCard";
import { HouseMap } from "./HouseMap";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { PriorityList } from "./PriorityList";
import { ScenarioPanel } from "./ScenarioPanel";

type ModeTab = "preset" | "custom";

type State = {
  scenarios: ScenarioMeta[];
  events: EventMeta[];
  mode: ModeTab;
  selectedId: string | null;
  customDraft: CustomRequest;
  response: SimulateResponse | null;
  loading: boolean;
  error: string | null;
};

const DEFAULT_CUSTOM: CustomRequest = {
  current_time: "20:30",
  sleep_time: "23:00",
  user_location: null,
  active_events: [],
  gap_rooms: [],
};

export function Simulator() {
  const [state, setState] = useState<State>({
    scenarios: [],
    events: [],
    mode: "preset",
    selectedId: null,
    customDraft: DEFAULT_CUSTOM,
    response: null,
    loading: false,
    error: null,
  });

  const sequencerRef = useRef<RequestSequencer | null>(null);
  if (sequencerRef.current === null) {
    sequencerRef.current = new RequestSequencer();
  }
  const sequencer = sequencerRef.current;

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      fetchScenarios(ctrl.signal),
      fetchEvents(ctrl.signal),
    ])
      .then(([scenarios, events]) => {
        setState((s) => ({ ...s, scenarios, events }));
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setState((s) => ({ ...s, error: `초기 로딩 실패: ${String(e)}` }));
      });
    return () => ctrl.abort();
  }, []);

  const handlePresetSelect = async (id: string) => {
    setState((s) => ({ ...s, selectedId: id, loading: true, error: null }));
    try {
      const response = await simulatePreset(id, sequencer.next());
      setState((s) => ({ ...s, response, loading: false }));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState((s) => ({ ...s, loading: false, error: String(e) }));
    }
  };

  const handleCustomSubmit = async (req: CustomRequest) => {
    setState((s) => ({
      ...s,
      loading: true,
      error: null,
      selectedId: null,
    }));
    try {
      const response = await simulateCustom(req, sequencer.next());
      setState((s) => ({ ...s, response, loading: false }));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState((s) => ({ ...s, loading: false, error: String(e) }));
    }
  };

  const switchMode = (mode: ModeTab) =>
    setState((s) => ({
      ...s,
      mode,
      response: null,
      error: null,
      selectedId: null,
    }));

  const setCustomDraft = (customDraft: CustomRequest) =>
    setState((s) => ({ ...s, customDraft }));

  const selected = state.scenarios.find((s) => s.id === state.selectedId);
  const userLocation =
    state.mode === "preset"
      ? selected?.user_location ?? null
      : state.customDraft.user_location;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <HouseMap
          rooms={state.response?.rooms}
          userLocation={userLocation}
        />
      </div>
      <div className="lg:col-span-2 space-y-4">
        <div
          role="tablist"
          aria-label="입력 모드"
          className="bg-paper border border-line rounded-lg p-1 flex gap-1 w-fit"
        >
          {(
            [
              { id: "preset", label: "시나리오 선택" },
              { id: "custom", label: "직접 입력" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={state.mode === t.id}
              onClick={() => switchMode(t.id)}
              className={`px-4 py-2 text-[13px] font-medium rounded-md transition
                ${
                  state.mode === t.id
                    ? "bg-white shadow-sm text-ink"
                    : "text-ink-3 hover:text-ink"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {state.mode === "preset" ? (
          <ScenarioPanel
            scenarios={state.scenarios}
            events={state.events}
            selectedId={state.selectedId}
            loading={state.loading}
            onSelect={handlePresetSelect}
          />
        ) : (
          <CustomModePanel
            events={state.events}
            value={state.customDraft}
            loading={state.loading}
            onChange={setCustomDraft}
            onSubmit={handleCustomSubmit}
          />
        )}

        {state.error && (
          <div className="p-3 bg-orange-50 border border-orange-700/30 rounded-lg text-orange-700 text-[13px]">
            <div>{state.error}</div>
            {state.mode === "preset" && state.selectedId && (
              <button
                onClick={() =>
                  state.selectedId && handlePresetSelect(state.selectedId)
                }
                className="mt-1 underline text-[12px]"
              >
                재시도
              </button>
            )}
          </div>
        )}

        {state.loading && <LoadingSkeleton />}

        {!state.response && !state.loading && !state.error && (
          <div className="border-2 border-dashed border-line rounded-xl p-8 text-center text-ink-3">
            <div className="text-2xl mb-2" aria-hidden>
              ←
            </div>
            <p className="text-[13px] text-ink-2">
              {state.mode === "preset"
                ? "좌측에서 시나리오를 선택하면 청소 우선순위와 AI 설명이 표시됩니다."
                : "이벤트·시간·위치를 입력하고 '시뮬레이션 실행'을 누르세요."}
            </p>
          </div>
        )}

        {state.response && !state.loading && (
          <>
            <PriorityList rooms={state.response.rooms} />
            <ExplanationCard response={state.response} />
          </>
        )}
      </div>
    </div>
  );
}
