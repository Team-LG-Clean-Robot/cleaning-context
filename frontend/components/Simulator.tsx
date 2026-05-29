"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
  RoomScore,
  ScenarioMeta,
  SimulateResponse,
} from "@/lib/types";
import { ROOM_LABEL, ROOMS_SEED } from "@/lib/types";
import { ClockIcon, MoonIcon, PinIcon } from "./icons";
import STATIC_SCENARIOS from "@/lib/static-scenarios.json";
import STATIC_EVENTS from "@/lib/static-events.json";
import STATIC_RESPONSES from "@/lib/static-responses.json";
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
import { PipelinePanel } from "./PipelinePanel";

type ModeTab = "preset" | "custom" | "timeline" | "pipeline";

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

function DecisionHero({
  response,
  currentRoom,
  liveScores,
  active,
  chips,
  timeStr,
  sleepStr,
  locLabel,
}: {
  response: SimulateResponse | null;
  currentRoom: RoomId | null;
  liveScores: RoomScore[];
  active: boolean;
  chips: string[];
  timeStr: string | null;
  sleepStr: string | null;
  locLabel: string | null;
}) {
  if (!response) {
    return (
      <div className="flex h-full flex-col justify-center gap-2">
        <div className="text-[11px] uppercase tracking-[0.14em] text-gray-500 font-semibold">
          현재 위치
        </div>
        <p className="text-[15px] text-text-muted leading-relaxed">
          맥락을 입력하면 청소 위치와 우선순위가 여기에 표시됩니다.
        </p>
      </div>
    );
  }
  const scores = liveScores.length ? liveScores : response.rooms;
  const ranked = [...scores].sort((a, b) => b.final - a.final);
  const top = ranked.find((r) => r.mode !== "excluded") ?? ranked[0];
  const room = currentRoom ?? top.room_id;
  const excluded = ranked.filter((r) => r.mode === "excluded");
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.14em] text-gray-500 font-semibold">
          현재 위치
        </span>
        {active && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-text-default animate-pulse" />
            청소 중
          </span>
        )}
      </div>
      <h2 className="text-[34px] sm:text-[40px] font-bold leading-none tracking-tight mt-2">
        {ROOM_LABEL[room]}
      </h2>
      {timeStr && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-muted mt-3">
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            {timeStr}
          </span>
          {sleepStr && (
            <span className="inline-flex items-center gap-1">
              <MoonIcon className="w-3.5 h-3.5" />
              취침 {sleepStr}
            </span>
          )}
          {locLabel && (
            <span className="inline-flex items-center gap-1">
              <PinIcon className="w-3.5 h-3.5" />
              {locLabel}
            </span>
          )}
        </div>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {chips.map((c) => (
            <span
              key={c}
              className="px-2 py-0.5 rounded-md text-[11px] bg-surface-base border border-border-default text-text-default"
            >
              {c}
            </span>
          ))}
        </div>
      )}
      {excluded.length > 0 && (
        <div className="text-[12px] text-gray-500 mt-2.5">
          {ROOM_LABEL[excluded[0].room_id]}
          {excluded.length > 1 ? ` 외 ${excluded.length - 1}곳` : ""} 제외
        </div>
      )}
      <div className="mt-5 pt-4 border-t border-border-default flex-1">
        <PriorityList rooms={ranked} />
      </div>
    </div>
  );
}

const DEFAULT_CUSTOM: CustomRequest = {
  current_time: "20:30",
  sleep_time: "23:00",
  user_location: null,
  active_events: [],
  gap_rooms: [],
};

// 맥락 입력이 없을 때의 기본 상태 — 공간별 기본 오염도 점수만. 로봇은 이 순서로 청소.
const BASE_RESPONSE: SimulateResponse = {
  scenario_id: "__base__",
  context_summary: "생활 맥락 입력 없음 · 공간별 기본 오염도 기준",
  rooms: [...ROOMS_SEED]
    .map((r) => ({
      room_id: r.id,
      base: r.base_score,
      breakdown: [
        { source: "base", label_ko: "기본 점수", delta: r.base_score, axis: "need" as const },
      ],
      final: r.base_score,
      mode: "normal" as const,
      exclusion_reason: null,
    }))
    .sort((a, b) => b.final - a.final),
  explanation:
    "현재 입력된 생활 맥락이 없습니다. 공간별 기본 오염도 점수 순서로 청소 우선순위를 정합니다. 시나리오를 선택하면 맥락이 반영된 우선순위로 바뀝니다.",
  fallback: false,
  duration_ms: 0,
  inferred_events: [],
};

const staticResponseMap = STATIC_RESPONSES as Record<string, Omit<SimulateResponse, "duration_ms">>;

export function Simulator() {
  const [coldStart, setColdStart] = useState(false);
  const [state, setState] = useState<State>({
    scenarios: STATIC_SCENARIOS as ScenarioMeta[],
    events: STATIC_EVENTS as EventMeta[],
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

  // Static mode: no backend needed for init
  // Fallback to API if static data missing (shouldn't happen)
  useEffect(() => {
    if (state.scenarios.length > 0) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePresetSelect = async (id: string) => {
    if (state.selectedId === id) {
      setState((s) => ({ ...s, selectedId: null, response: null, error: null }));
      return;
    }

    // Try static cache first (instant, no backend)
    const cached = staticResponseMap[id];
    if (cached) {
      const response: SimulateResponse = { ...cached, duration_ms: 0 };
      setState((s) => ({ ...s, selectedId: id, response, loading: false, error: null }));
      return;
    }

    // Fallback to API
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
      response: mode === "pipeline" ? s.response : null,
      error: null,
      selectedId: mode === "pipeline" ? s.selectedId : null,
    }));

  const setCustomDraft = (customDraft: CustomRequest) =>
    setState((s) => ({ ...s, customDraft }));

  const [detailRoom, setDetailRoom] = useState<RoomScore | null>(null);

  // 데모 청소 진행 상태 — HouseMap이 전달, 우측 카드가 실시간 반영
  const [live, setLive] = useState<{ room: RoomId | null; scores: RoomScore[] }>({
    room: null,
    scores: [],
  });
  const lastRoomRef = useRef<RoomId | null>(null);
  const handleCleaningState = useCallback(
    (s: { room: RoomId | null; scores: RoomScore[] }) => {
      if (s.room) lastRoomRef.current = s.room;
      setLive(s);
    },
    [],
  );

  const selected = state.scenarios.find((s) => s.id === state.selectedId);
  const isTimeline = state.mode === "timeline";
  // preset 모드에서 아무 시나리오도 선택 안 됐으면 기본 점수 상태(BASE_RESPONSE) 표시
  const presetBase =
    (state.mode === "preset" || state.mode === "pipeline") && !state.selectedId;
  const effectiveResponse = isTimeline
    ? timeline.currentResponse
    : state.response ?? (presetBase ? BASE_RESPONSE : null);
  const userLocation = isTimeline
    ? timeline.currentUserLocation
    : (state.mode === "preset" || state.mode === "pipeline")
      ? selected?.user_location ?? null
      : state.customDraft.user_location;
  const currentTime = isTimeline
    ? timeline.currentTimeStr
    : (state.mode === "preset" || state.mode === "pipeline")
      ? selected?.current_time ?? null
      : state.customDraft.current_time;

  // 시나리오/응답이 바뀌면 청소 진행 상태 리셋
  const scenarioKey = effectiveResponse?.scenario_id ?? null;
  useEffect(() => {
    lastRoomRef.current = null;
    setLive({ room: null, scores: [] });
  }, [scenarioKey]);

  const currentRoom = live.room ?? lastRoomRef.current;
  const liveScores = live.scores.length ? live.scores : effectiveResponse?.rooms ?? [];


  if (coldStart && state.scenarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-3 border-accent-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[14px] text-text-muted">서버 준비 중입니다 — 잠시만 기다려 주세요</p>
        <p className="text-[11px] text-text-muted">무료 서버라 첫 접속 시 30초~1분 소요될 수 있습니다</p>
      </div>
    );
  }

  const eventLabelMap = new Map(state.events.map((e) => [e.id, e.name_ko]));
  const ctxEvents = isTimeline
    ? []
    : state.mode === "preset" || state.mode === "pipeline"
      ? selected?.active_events ?? []
      : state.customDraft.active_events;
  const ctxChips = ctxEvents.map((id) => eventLabelMap.get(id) ?? id);
  const sleepTime = isTimeline
    ? null
    : state.mode === "preset" || state.mode === "pipeline"
      ? selected?.sleep_time ?? null
      : state.customDraft.sleep_time;

  const modeTabs = (
    <div
      role="tablist"
      aria-label="입력 모드"
      className="bg-surface-base border border-border-default rounded-lg p-1 flex flex-wrap gap-1 w-fit"
    >
      {(
        [
          { id: "pipeline", label: "파이프라인" },
          { id: "preset", label: "시나리오 선택" },
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
  );

  return (
    <div className="space-y-8">
      {detailRoom && (
        <RoomDetail room={detailRoom} onClose={() => setDetailRoom(null)} />
      )}

      {/* ── 1. HERO: 청소 결정 + 지도 ── */}
      <section className="bg-white border border-border-default rounded-2xl shadow-sm overflow-hidden">
        <div className="grid lg:grid-cols-[1.55fr_1fr]">
          <div className="p-3 sm:p-4 border-b border-border-default lg:border-b-0 lg:border-r">
            <HouseMap
              rooms={effectiveResponse?.rooms}
              userLocation={userLocation}
              onRoomClick={effectiveResponse ? setDetailRoom : undefined}
              paused={isTimeline && !timeline.playing}
              currentTime={currentTime}
              staticBase={!effectiveResponse || effectiveResponse.scenario_id === "__base__"}
              onCleaningStateChange={handleCleaningState}
            />
          </div>
          <div className="p-5 sm:p-7">
            {state.loading && !isTimeline ? (
              <LoadingSkeleton />
            ) : (
              <DecisionHero
                response={effectiveResponse}
                currentRoom={currentRoom}
                liveScores={liveScores}
                active={!!live.room}
                chips={ctxChips}
                timeStr={currentTime}
                sleepStr={sleepTime}
                locLabel={userLocation ? ROOM_LABEL[userLocation] : null}
              />
            )}
          </div>
        </div>
      </section>

      {/* ── 2. IoT 센서 모니터링 ── */}
      <SensorDashboard
        scenarioId={isTimeline ? null : (state.response?.scenario_id ?? state.selectedId)}
        overrideSensors={isTimeline ? timeline.currentSensors : undefined}
      />

      {/* ── 3. 맥락 입력 · 데모 조작 ── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-[18px] font-bold tracking-tight">시뮬레이션</h2>
          {modeTabs}
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
        ) : state.mode === "timeline" ? (
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
        ) : state.mode === "pipeline" ? (
          <>
            <ScenarioPanel
              scenarios={state.scenarios}
              events={state.events}
              selectedId={state.selectedId}
              loading={state.loading}
              onSelect={handlePresetSelect}
            />
            <PipelinePanel response={state.response} scenarioId={state.selectedId} events={state.events} />
          </>
        ) : null}

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
      </section>

      {/* ── 4. AI 설명 + 후속 질문 (최하단 — 파고드는 영역) ── */}
      {effectiveResponse && (isTimeline || !state.loading) && (
        <div className="bg-white border border-border-default rounded-2xl shadow-sm divide-y divide-border-default overflow-hidden">
          <ExplanationCard
            response={effectiveResponse}
            currentRoom={currentRoom}
            liveScores={liveScores}
          />
          <AskPanel
            key={effectiveResponse?.scenario_id ?? "general"}
            response={effectiveResponse}
          />
        </div>
      )}
    </div>
  );
}
