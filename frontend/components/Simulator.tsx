"use client";
import { useEffect, useRef, useState } from "react";
import {
  RequestSequencer,
  fetchEvents,
  fetchScenarios,
  simulateCustom,
  simulatePreset,
  simulateSensors,
  waitForBackend,
} from "@/lib/api";
import { getSensorStates, toSensorReadings } from "@/lib/sensor-mock";
import type {
  CustomRequest,
  EventMeta,
  RoomId,
  ScenarioMeta,
  SimulateResponse,
} from "@/lib/types";
import { ROOM_LABEL } from "@/lib/types";
import { useTimeline } from "@/lib/useTimeline";
import { AskPanel } from "./AskPanel";
import { CustomModePanel } from "./CustomModePanel";
import { ExplanationCard } from "./ExplanationCard";
import { HouseMap } from "./HouseMap";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { PriorityList } from "./PriorityList";
import { RoomDetail } from "./RoomDetail";
import { ScenarioPanel } from "./ScenarioPanel";
import { SensorDashboard } from "./SensorDashboard";
import { TimelinePanel } from "./TimelinePanel";

type ModeTab = "preset" | "custom" | "timeline";

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

function ContextSummary({
  mode,
  selected,
  customDraft,
  events,
}: {
  mode: ModeTab;
  selected: ScenarioMeta | undefined;
  customDraft: CustomRequest;
  events: EventMeta[];
}) {
  const eventLabel = new Map(events.map((e) => [e.id, e.name_ko]));
  const title = mode === "preset" ? selected?.name_ko ?? "시나리오" : "직접 입력";
  const ct = mode === "preset" ? selected?.current_time : customDraft.current_time;
  const st = mode === "preset" ? selected?.sleep_time : customDraft.sleep_time;
  const loc = mode === "preset" ? selected?.user_location : customDraft.user_location;
  const evs = mode === "preset" ? selected?.active_events ?? [] : customDraft.active_events;
  if (!ct) return null;
  return (
    <section
      aria-label="입력 컨텍스트"
      className="bg-surface-muted border border-border-default rounded-lg p-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">
          입력 컨텍스트
        </h3>
        <span className="text-[12px] font-medium text-text-default">{title}</span>
      </div>
      <div className="text-[12px] text-text-muted mt-1.5">
        🕒 {ct} · 😴 취침 {st}
        {loc && ` · 📍 ${ROOM_LABEL[loc]}`}
      </div>
      {evs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {evs.map((eid) => (
            <span
              key={eid}
              className="px-2 py-0.5 rounded-md text-[11px] bg-white border border-border-default text-text-default"
            >
              {eventLabel.get(eid) ?? eid}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function SamplePreview() {
  return (
    <section
      aria-label="AI 설명 미리보기"
      className="relative bg-surface-base border border-dashed border-border-default rounded-xl p-5"
    >
      <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider text-gray-500 bg-white border border-border-default rounded px-1.5 py-0.5">
        미리보기
      </span>
      <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
        AI 설명 예시 · 비 오는 날 귀가
      </div>
      <p className="text-[14px] text-text-default leading-relaxed">
        오늘은 비가 와서 현관 오염 가능성이 높고, 사용자가 방금 귀가했기 때문에{" "}
        <strong className="font-semibold">현관을 우선 청소</strong>합니다. 사용자가 거실로
        이동할 가능성이 높아 거실도 보조 청소합니다.{" "}
        <strong className="font-semibold">침실은 취침 시간(23:00)이 가까워</strong> 소음을
        줄이기 위해 제외했습니다.
      </p>
      <div className="text-[11px] text-gray-500 mt-3">
        좌측에서 시나리오를 선택하면 실제 응답이 표시됩니다.
      </div>
    </section>
  );
}

const DEFAULT_CUSTOM: CustomRequest = {
  current_time: "20:30",
  sleep_time: "23:00",
  user_location: null,
  active_events: [],
  gap_rooms: [],
};

export function Simulator() {
  const [coldStart, setColdStart] = useState(false);
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
    async function init() {
      try {
        const [scenarios, events] = await Promise.all([
          fetchScenarios(ctrl.signal),
          fetchEvents(ctrl.signal),
        ]);
        setState((s) => ({ ...s, scenarios, events }));
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setColdStart(true);
        await waitForBackend(ctrl.signal);
        if (ctrl.signal.aborted) return;
        setColdStart(false);
        try {
          const [scenarios, events] = await Promise.all([
            fetchScenarios(ctrl.signal),
            fetchEvents(ctrl.signal),
          ]);
          setState((s) => ({ ...s, scenarios, events }));
        } catch (e2) {
          if ((e2 as Error).name === "AbortError") return;
          setState((s) => ({ ...s, error: `초기 로딩 실패: ${String(e2)}` }));
        }
      }
    }
    init();
    return () => ctrl.abort();
  }, []);

  const handlePresetSelect = async (id: string) => {
    if (state.selectedId === id) {
      setState((s) => ({ ...s, selectedId: null, response: null, error: null }));
      return;
    }
    setState((s) => ({ ...s, selectedId: id, loading: true, error: null }));
    try {
      const scenario = state.scenarios.find((sc) => sc.id === id);
      const sensors = getSensorStates(id);
      const readings = toSensorReadings(sensors, scenario?.current_time ?? "20:00");

      let response;
      if (readings.length > 0) {
        response = await simulateSensors(
          readings,
          scenario?.current_time ?? "20:00",
          scenario?.sleep_time ?? "23:00",
          sequencer.next(),
        );
      } else {
        response = await simulatePreset(id, sequencer.next());
      }
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

  const timeline = useTimeline(state.mode === "timeline");

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

  const [selectedRoom, setSelectedRoom] = useState<RoomId | null>(null);

  const selected = state.scenarios.find((s) => s.id === state.selectedId);
  const isTimeline = state.mode === "timeline";
  const effectiveResponse = isTimeline ? timeline.currentResponse : state.response;
  const userLocation = isTimeline
    ? timeline.currentUserLocation
    : state.mode === "preset"
      ? selected?.user_location ?? null
      : state.customDraft.user_location;

  const detailRoom = selectedRoom && state.response
    ? state.response.rooms.find((r) => r.room_id === selectedRoom)
    : null;

  if (coldStart) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-3 border-accent-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[14px] text-text-muted">서버 준비 중입니다 — 잠시만 기다려 주세요</p>
        <p className="text-[11px] text-text-muted">무료 서버라 첫 접속 시 30초~1분 소요될 수 있습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
    {detailRoom && (
      <RoomDetail room={detailRoom} onClose={() => setSelectedRoom(null)} />
    )}
    <AskPanel
      key={effectiveResponse?.scenario_id ?? "general"}
      response={effectiveResponse}
    />
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <HouseMap
          rooms={effectiveResponse?.rooms}
          userLocation={userLocation}
          onRoomClick={effectiveResponse ? setSelectedRoom : undefined}
        />
        <SensorDashboard
          scenarioId={isTimeline ? null : (state.response?.scenario_id ?? state.selectedId)}
          overrideSensors={isTimeline ? timeline.currentSensors : undefined}
        />
      </div>
      <div className="lg:col-span-2 space-y-4">
        <div
          role="tablist"
          aria-label="입력 모드"
          className="bg-surface-base border border-border-default rounded-lg p-1 flex gap-1 w-fit"
        >
          {(
            [
              { id: "preset", label: "시나리오 선택" },
              { id: "custom", label: "직접 입력" },
              { id: "timeline", label: "하루 시뮬레이션" },
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
                    ? "bg-white shadow-sm text-text-default"
                    : "text-gray-500 hover:text-text-default"
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
        ) : state.mode === "custom" ? (
          <CustomModePanel
            events={state.events}
            value={state.customDraft}
            loading={state.loading}
            onChange={setCustomDraft}
            onSubmit={handleCustomSubmit}
          />
        ) : (
          <TimelinePanel
            currentMinute={timeline.currentMinute}
            currentTimeStr={timeline.currentTimeStr}
            playing={timeline.playing}
            speed={timeline.speed}
            prefetchStatus={timeline.prefetchStatus}
            prefetchProgress={timeline.prefetchProgress}
            prefetchTotal={timeline.prefetchTotal}
            keyframes={timeline.keyframes}
            activeKeyframeIndex={timeline.activeKeyframeIndex}
            onTogglePlay={timeline.togglePlay}
            onSpeedChange={timeline.setSpeed}
            onSeek={timeline.seek}
          />
        )}

        {state.error && (
          <div className="p-3 bg-surface-muted border-l-4 border-l-text-default border border-border-default rounded-md text-[13px] text-text-default">
            <div className="font-medium">{state.error}</div>
            {state.mode === "preset" && state.selectedId && (
              <button
                onClick={() =>
                  state.selectedId && handlePresetSelect(state.selectedId)
                }
                className="mt-1 underline text-[12px] text-text-muted hover:text-text-default"
              >
                재시도
              </button>
            )}
          </div>
        )}

        {state.loading && !isTimeline && <LoadingSkeleton />}

        {!isTimeline && !state.response && !state.loading && (
          state.mode === "preset" ? (
            <SamplePreview />
          ) : (
            <div className="border-2 border-dashed border-border-default rounded-xl p-8 text-center text-gray-500">
              <div className="text-2xl mb-2" aria-hidden>
                ←
              </div>
              <p className="text-[13px] text-text-muted">
                이벤트·시간·위치를 입력하고 '시뮬레이션 실행'을 누르세요.
              </p>
            </div>
          )
        )}

        {effectiveResponse && (isTimeline || !state.loading) && (
          <>
            {!isTimeline && (
              <ContextSummary
                mode={state.mode}
                selected={selected}
                customDraft={state.customDraft}
                events={state.events}
              />
            )}
            <PriorityList rooms={effectiveResponse.rooms} />
            <ExplanationCard response={effectiveResponse} />
          </>
        )}
      </div>
    </div>
    </div>
  );
}
