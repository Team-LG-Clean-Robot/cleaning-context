import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomId, RoomScore, SimulateResponse, TimelineKeyframe } from "./types";
import type { SensorState } from "./sensor-mock";
import { getSensorStates } from "./sensor-mock";
import { simulateCustom } from "./api";
import { DAY_KEYFRAMES } from "./timeline-data";
import STATIC_TIMELINE from "./static-timeline.json";

const TICK_MS = 50;
const MINUTES_PER_REAL_SEC = 8;

type PrefetchStatus = "idle" | "loading" | "ready" | "error";
type Speed = 1 | 2 | 4;

type TimelineHook = {
  prefetchStatus: PrefetchStatus;
  prefetchProgress: number;
  prefetchTotal: number;
  playing: boolean;
  speed: Speed;
  currentMinute: number;
  currentTimeStr: string;
  activeKeyframeIndex: number;
  currentResponse: SimulateResponse | null;
  currentSensors: SensorState[];
  currentUserLocation: RoomId | null;
  keyframes: TimelineKeyframe[];
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (s: Speed) => void;
  seek: (minute: number) => void;
};

function minuteToStr(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = Math.floor(m % 60);
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateRooms(prev: RoomScore[], next: RoomScore[], t: number): RoomScore[] {
  return prev.map((pr) => {
    const nr = next.find((r) => r.room_id === pr.room_id) ?? pr;
    return {
      ...pr,
      final: Math.round(lerp(pr.final, nr.final, t)),
      base: Math.round(lerp(pr.base, nr.base, t)),
      mode: t < 0.5 ? pr.mode : nr.mode,
      exclusion_reason: t < 0.5 ? pr.exclusion_reason : nr.exclusion_reason,
      breakdown: t < 0.5 ? pr.breakdown : nr.breakdown,
    };
  });
}

function buildSensors(
  base: SensorState[],
  overrides: TimelineKeyframe["sensorOverrides"],
): SensorState[] {
  return base.map((s) => {
    const o = overrides[s.id];
    if (!o) return { ...s, value: 0, label: "대기", active: false };
    return { ...s, value: o.value, label: o.label, active: o.active };
  });
}

function interpolateSensors(
  base: SensorState[],
  prevOv: TimelineKeyframe["sensorOverrides"],
  nextOv: TimelineKeyframe["sensorOverrides"],
  t: number,
): SensorState[] {
  return base.map((s) => {
    const p = prevOv[s.id];
    const n = nextOv[s.id];
    if (!p && !n) return { ...s, value: 0, label: "대기", active: false };
    if (!p) {
      const active = t >= 0.5 && (n?.active ?? false);
      return { ...s, value: n?.value ?? 0, label: n?.label ?? "대기", active };
    }
    if (!n) {
      const active = t < 0.5 && p.active;
      return { ...s, value: p.value, label: p.label, active };
    }
    const active = t < 0.5 ? p.active : n.active;
    const value = s.noiseRange > 0 || (typeof p.value === "number" && typeof n.value === "number")
      ? Math.round(lerp(p.value, n.value, t) * 10) / 10
      : t < 0.5 ? p.value : n.value;
    const label = t < 0.5 ? p.label : n.label;
    return { ...s, value, label, active };
  });
}

function findBracketingKeyframes(minute: number, keyframes: TimelineKeyframe[]): {
  prevIdx: number;
  nextIdx: number;
  t: number;
} {
  if (minute <= keyframes[0].minuteOfDay) {
    return { prevIdx: 0, nextIdx: 0, t: 0 };
  }
  if (minute >= keyframes[keyframes.length - 1].minuteOfDay) {
    return { prevIdx: keyframes.length - 1, nextIdx: keyframes.length - 1, t: 0 };
  }
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (minute >= keyframes[i].minuteOfDay && minute < keyframes[i + 1].minuteOfDay) {
      const span = keyframes[i + 1].minuteOfDay - keyframes[i].minuteOfDay;
      const t = span > 0 ? (minute - keyframes[i].minuteOfDay) / span : 0;
      return { prevIdx: i, nextIdx: i + 1, t };
    }
  }
  return { prevIdx: keyframes.length - 1, nextIdx: keyframes.length - 1, t: 0 };
}

export function useTimeline(active: boolean): TimelineHook {
  const [prefetchStatus, setPrefetchStatus] = useState<PrefetchStatus>("idle");
  const [prefetchProgress, setPrefetchProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState<Speed>(1);
  const [currentMinute, setCurrentMinute] = useState(DAY_KEYFRAMES[0].minuteOfDay);

  const cacheRef = useRef<Map<number, SimulateResponse>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const baseSensors = useRef<SensorState[]>(getSensorStates(null));

  const prefetchAll = useCallback(async () => {
    if (cacheRef.current.size === DAY_KEYFRAMES.length) {
      setPrefetchStatus("ready");
      return;
    }

    // Use static pre-generated data (instant, no backend needed)
    const staticData = STATIC_TIMELINE as Array<Omit<SimulateResponse, "duration_ms">>;
    if (staticData.length === DAY_KEYFRAMES.length) {
      const results = new Map<number, SimulateResponse>();
      for (let i = 0; i < staticData.length; i++) {
        results.set(i, { ...staticData[i], duration_ms: 0 } as SimulateResponse);
      }
      cacheRef.current = results;
      setPrefetchProgress(results.size);
      setPrefetchStatus("ready");
      return;
    }

    // Fallback to API if static data missing
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPrefetchStatus("loading");
    setPrefetchProgress(0);
    const results = new Map<number, SimulateResponse>();

    const BATCH = 2;
    for (let start = 0; start < DAY_KEYFRAMES.length; start += BATCH) {
      if (ctrl.signal.aborted) break;
      const batch = DAY_KEYFRAMES.slice(start, start + BATCH);
      const promises = batch.map(async (kf, j) => {
        const i = start + j;
        try {
          const res = await simulateCustom(kf.request, ctrl.signal);
          results.set(i, res);
        } catch {
          // skip failed
        }
      });
      await Promise.allSettled(promises);
      if (!ctrl.signal.aborted) {
        cacheRef.current = new Map(results);
        setPrefetchProgress(results.size);
        if (results.size >= 2) {
          setPrefetchStatus("ready");
        }
      }
    }
    if (!ctrl.signal.aborted) {
      cacheRef.current = results;
      setPrefetchStatus(results.size > 0 ? "ready" : "error");
    }
  }, []);

  const prefetchStatusRef = useRef(prefetchStatus);
  prefetchStatusRef.current = prefetchStatus;

  useEffect(() => {
    if (active && prefetchStatusRef.current === "idle") {
      prefetchAll();
    }
    if (!active) {
      setPlaying(false);
      abortRef.current?.abort();
    }
  }, [active, prefetchAll]);

  useEffect(() => {
    if (!active || !playing || prefetchStatus !== "ready") return;
    const id = setInterval(() => {
      setCurrentMinute((prev) => {
        const next = prev + (TICK_MS / 1000) * speed * MINUTES_PER_REAL_SEC;
        if (next >= DAY_KEYFRAMES[DAY_KEYFRAMES.length - 1].minuteOfDay) {
          setPlaying(false);
          return DAY_KEYFRAMES[DAY_KEYFRAMES.length - 1].minuteOfDay;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [active, playing, speed, prefetchStatus]);

  const { prevIdx, nextIdx, t } = findBracketingKeyframes(currentMinute, DAY_KEYFRAMES);
  const cache = cacheRef.current;

  const prevResp = cache.get(prevIdx) ?? null;
  const nextResp = cache.get(nextIdx) ?? null;

  let currentResponse: SimulateResponse | null = null;
  if (prevResp && nextResp && prevIdx !== nextIdx) {
    currentResponse = {
      ...prevResp,
      rooms: interpolateRooms(prevResp.rooms, nextResp.rooms, t),
      explanation: t < 0.5 ? prevResp.explanation : nextResp.explanation,
      context_summary: t < 0.5 ? prevResp.context_summary : nextResp.context_summary,
      fallback: t < 0.5 ? prevResp.fallback : nextResp.fallback,
      inferred_events: t < 0.5 ? prevResp.inferred_events : nextResp.inferred_events,
      ml: t < 0.5 ? prevResp.ml : nextResp.ml,
    };
  } else {
    currentResponse = prevResp;
  }

  const currentSensors = prevIdx !== nextIdx
    ? interpolateSensors(
        baseSensors.current,
        DAY_KEYFRAMES[prevIdx].sensorOverrides,
        DAY_KEYFRAMES[nextIdx].sensorOverrides,
        t,
      )
    : buildSensors(baseSensors.current, DAY_KEYFRAMES[prevIdx].sensorOverrides);

  const currentUserLocation: RoomId | null =
    (t < 0.5
      ? DAY_KEYFRAMES[prevIdx].request.user_location
      : DAY_KEYFRAMES[nextIdx].request.user_location) as RoomId | null;

  return {
    prefetchStatus,
    prefetchProgress,
    prefetchTotal: DAY_KEYFRAMES.length,
    playing,
    speed,
    currentMinute,
    currentTimeStr: minuteToStr(currentMinute),
    activeKeyframeIndex: prevIdx,
    currentResponse,
    currentSensors,
    currentUserLocation,
    keyframes: DAY_KEYFRAMES,
    play: () => {
      if (currentMinute >= DAY_KEYFRAMES[DAY_KEYFRAMES.length - 1].minuteOfDay) {
        setCurrentMinute(DAY_KEYFRAMES[0].minuteOfDay);
      }
      setPlaying(true);
    },
    pause: () => setPlaying(false),
    togglePlay: () => {
      if (playing) {
        setPlaying(false);
      } else {
        if (currentMinute >= DAY_KEYFRAMES[DAY_KEYFRAMES.length - 1].minuteOfDay) {
          setCurrentMinute(DAY_KEYFRAMES[0].minuteOfDay);
        }
        setPlaying(true);
      }
    },
    setSpeed: setSpeedState,
    seek: (minute: number) => setCurrentMinute(Math.max(0, Math.min(1439, minute))),
  };
}
