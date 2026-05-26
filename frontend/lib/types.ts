export type Mode = "normal" | "quiet" | "delayed" | "excluded";

export type RoomId =
  | "entrance"
  | "living"
  | "kitchen"
  | "bedroom"
  | "bathroom";

export const ROOM_IDS: readonly RoomId[] = [
  "entrance",
  "living",
  "kitchen",
  "bedroom",
  "bathroom",
] as const;

export const ROOM_LABEL: Record<RoomId, string> = {
  entrance: "현관",
  living: "거실",
  kitchen: "주방",
  bedroom: "침실",
  bathroom: "욕실",
};

export type ScoreContribution = {
  source: string;
  label_ko: string;
  delta: number;
};

export type RoomScore = {
  room_id: RoomId;
  base: number;
  breakdown: ScoreContribution[];
  final: number;
  mode: Mode;
  exclusion_reason: string | null;
};

export type MlEventConfidence = {
  event_id: string;
  ml_label: string;
  f1: number;
};

export type MlInfo = {
  model_name: string;
  cv_accuracy: number;
  dataset: string;
  event_confidence: MlEventConfidence[];
};

export type SimulateResponse = {
  scenario_id: string;
  context_summary: string;
  rooms: RoomScore[];
  explanation: string;
  fallback: boolean;
  duration_ms: number;
  ml: MlInfo | null;
};

export type ScenarioMeta = {
  id: string;
  name_ko: string;
  description: string;
  current_time: string;
  sleep_time: string;
  user_location: RoomId | null;
  active_events: string[];
};

export type EventMeta = {
  id: string;
  name_ko: string;
  effects: { room_id: RoomId | "*"; delta: number }[];
};

export type CustomRequest = {
  current_time: string;
  sleep_time: string;
  user_location: RoomId | null;
  active_events: string[];
  gap_rooms?: string[];
};

export type RoomBbox = {
  id: RoomId;
  name_ko: string;
  base_score: number;
  bbox: { x: number; y: number; w: number; h: number };
  polygon?: string;
  center?: { x: number; y: number };
};

// 도면 이미지 배경 기반. viewBox 600×400. 벽선 픽셀 분석 기반 좌표.
export const ROOMS_SEED: RoomBbox[] = [
  { id: "kitchen",  name_ko: "주방", base_score: 20, bbox: { x: 197, y: 44, w: 161, h: 130 } },
  { id: "bedroom",  name_ko: "침실", base_score: 15, bbox: { x: 366, y: 44, w: 146, h: 200 } },
  { id: "living",   name_ko: "거실", base_score: 25, bbox: { x: 90, y: 120, w: 172, h: 220 }, polygon: "90,120 195,120 195,176 262,176 262,340 90,340", center: { x: 170, y: 265 } },
  { id: "entrance", name_ko: "현관", base_score: 30, bbox: { x: 265, y: 176, w: 88, h: 164 } },
  { id: "bathroom", name_ko: "욕실", base_score: 10, bbox: { x: 358, y: 246, w: 132, h: 98 } },
];

export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export type AskRequest = {
  context_summary: string;
  rooms: RoomScore[];
  question: string;
};

export type AskResponse = {
  answer: string;
  fallback: boolean;
  duration_ms: number;
};
