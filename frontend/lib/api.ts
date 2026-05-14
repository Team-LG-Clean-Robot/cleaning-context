import type {
  CustomRequest,
  EventMeta,
  ScenarioMeta,
  SimulateResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function jsonOrThrow<T>(r: Response, ctx: string): Promise<T> {
  if (!r.ok) {
    let detail = `${r.status}`;
    try {
      const body = await r.json();
      if (body?.detail) {
        detail =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(`${ctx}: ${detail}`);
  }
  return r.json() as Promise<T>;
}

export async function fetchScenarios(signal?: AbortSignal): Promise<ScenarioMeta[]> {
  const r = await fetch(`${BASE}/api/scenarios`, { cache: "no-store", signal });
  return jsonOrThrow(r, "scenarios");
}

export async function fetchEvents(signal?: AbortSignal): Promise<EventMeta[]> {
  const r = await fetch(`${BASE}/api/events`, { cache: "no-store", signal });
  return jsonOrThrow(r, "events");
}

export async function simulatePreset(
  scenarioId: string,
  signal?: AbortSignal,
): Promise<SimulateResponse> {
  const r = await fetch(`${BASE}/api/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_id: scenarioId }),
    signal,
  });
  return jsonOrThrow(r, "simulate");
}

export async function simulateCustom(
  req: CustomRequest,
  signal?: AbortSignal,
): Promise<SimulateResponse> {
  const r = await fetch(`${BASE}/api/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      custom: { ...req, gap_rooms: req.gap_rooms ?? [] },
    }),
    signal,
  });
  return jsonOrThrow(r, "simulate");
}

/** 빠른 연속 요청 시 마지막 요청만 살리는 헬퍼. */
export class RequestSequencer {
  private ctrl: AbortController | null = null;
  next(): AbortSignal {
    this.ctrl?.abort();
    this.ctrl = new AbortController();
    return this.ctrl.signal;
  }
}
