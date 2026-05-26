import type { RoomId } from "./types";

export type SensorState = {
  id: string;
  name_ko: string;
  room: RoomId | "external";
  icon: string;
  value: number;
  unit: string;
  label: string;
  active: boolean;
  noiseRange: number;
};

const BASE_SENSORS: Omit<SensorState, "value" | "label" | "active">[] = [
  { id: "door_lock", name_ko: "현관 도어락", room: "entrance", icon: "🔒", unit: "", noiseRange: 0 },
  { id: "induction", name_ko: "인덕션", room: "kitchen", icon: "🍳", unit: "W", noiseRange: 50 },
  { id: "microwave", name_ko: "전자레인지", room: "kitchen", icon: "📦", unit: "W", noiseRange: 20 },
  { id: "refrigerator", name_ko: "냉장고", room: "kitchen", icon: "🧊", unit: "회/h", noiseRange: 0 },
  { id: "air_conditioner", name_ko: "에어컨", room: "living", icon: "❄️", unit: "°C", noiseRange: 0.3 },
  { id: "tv", name_ko: "TV", room: "living", icon: "📺", unit: "min", noiseRange: 0 },
  { id: "bed_sensor", name_ko: "침대 센서", room: "bedroom", icon: "🛏️", unit: "", noiseRange: 0 },
  { id: "motion_sensor", name_ko: "모션 센서", room: "living", icon: "👁️", unit: "", noiseRange: 0 },
  { id: "humidity_bath", name_ko: "욕실 습도", room: "bathroom", icon: "💧", unit: "%", noiseRange: 1.5 },
  { id: "smart_speaker", name_ko: "스마트 스피커", room: "living", icon: "🔊", unit: "", noiseRange: 0 },
  { id: "weather_api", name_ko: "날씨 API", room: "external", icon: "🌤️", unit: "", noiseRange: 0 },
  { id: "calendar", name_ko: "캘린더", room: "external", icon: "📅", unit: "", noiseRange: 0 },
];

type ScenarioSensorConfig = Record<string, Partial<Record<string, { value: number; label: string; active: boolean }>>>;

const SCENARIO_OVERRIDES: ScenarioSensorConfig = {
  rainy_return: {
    door_lock: { value: 1, label: "외부에서 열림", active: true },
    weather_api: { value: 1, label: "비 (강수량 3mm)", active: true },
    motion_sensor: { value: 1, label: "현관 감지", active: true },
    humidity_bath: { value: 52, label: "52%", active: false },
    air_conditioner: { value: 24, label: "24°C 가동", active: true },
    tv: { value: 0, label: "꺼짐", active: false },
    bed_sensor: { value: 0, label: "비어있음", active: false },
    induction: { value: 0, label: "꺼짐", active: false },
  },
  post_cooking: {
    induction: { value: 0, label: "방금 OFF", active: true },
    microwave: { value: 0, label: "꺼짐", active: false },
    refrigerator: { value: 5, label: "5회/h 개폐", active: true },
    motion_sensor: { value: 1, label: "거실 감지", active: true },
    humidity_bath: { value: 48, label: "48%", active: false },
    air_conditioner: { value: 23, label: "23°C 가동", active: true },
    weather_api: { value: 0, label: "맑음", active: false },
  },
  pre_sleep: {
    bed_sensor: { value: 1, label: "점유 중", active: true },
    motion_sensor: { value: 1, label: "침실 감지", active: true },
    tv: { value: 0, label: "꺼짐", active: false },
    induction: { value: 0, label: "꺼짐", active: false },
    door_lock: { value: 0, label: "잠김", active: false },
    humidity_bath: { value: 65, label: "65%", active: false },
    air_conditioner: { value: 22, label: "22°C 수면모드", active: true },
  },
  guest_incoming: {
    calendar: { value: 1, label: "1시간 후 손님", active: true },
    motion_sensor: { value: 1, label: "거실 감지", active: true },
    door_lock: { value: 0, label: "잠김", active: false },
    air_conditioner: { value: 23, label: "23°C 가동", active: true },
    tv: { value: 45, label: "45분째 켜짐", active: true },
    weather_api: { value: 0, label: "맑음", active: false },
  },
  morning_quick_clean: {
    door_lock: { value: 1, label: "외부에서 잠김", active: true },
    motion_sensor: { value: 0, label: "감지 없음", active: false },
    bed_sensor: { value: 0, label: "비어있음", active: false },
    tv: { value: 0, label: "꺼짐", active: false },
    induction: { value: 0, label: "꺼짐", active: false },
    weather_api: { value: 0, label: "맑음", active: false },
    air_conditioner: { value: 26, label: "26°C 절전", active: true },
  },
  cooking_in_progress: {
    induction: { value: 1800, label: "1800W 가동 6분", active: true },
    microwave: { value: 700, label: "700W 가동 3분", active: true },
    refrigerator: { value: 3, label: "3회/h 개폐", active: true },
    motion_sensor: { value: 1, label: "주방 감지", active: true },
    humidity_bath: { value: 50, label: "50%", active: false },
    air_conditioner: { value: 24, label: "24°C 가동", active: true },
    weather_api: { value: 0, label: "맑음", active: false },
  },
};

export function getSensorStates(scenarioId: string | null): SensorState[] {
  const overrides = scenarioId ? SCENARIO_OVERRIDES[scenarioId] ?? {} : {};
  return BASE_SENSORS.map((base) => {
    const o = overrides[base.id];
    return {
      ...base,
      value: o?.value ?? 0,
      label: o?.label ?? "대기",
      active: o?.active ?? false,
    };
  });
}

export function addNoise(sensors: SensorState[]): SensorState[] {
  return sensors.map((s) => {
    if (s.noiseRange === 0 || !s.active) return s;
    const noise = (Math.random() - 0.5) * 2 * s.noiseRange;
    return { ...s, value: Math.round((s.value + noise) * 10) / 10 };
  });
}
