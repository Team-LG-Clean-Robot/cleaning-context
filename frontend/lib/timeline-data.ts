import type { TimelineKeyframe } from "./types";

export function timeToMinute(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function kf(
  time: string,
  icon: string,
  description: string,
  robotAction: string,
  request: TimelineKeyframe["request"],
  sensorOverrides: TimelineKeyframe["sensorOverrides"],
): TimelineKeyframe {
  return { time, minuteOfDay: timeToMinute(time), icon, description, robotAction, request, sensorOverrides };
}

const SLEEP = "23:00";

export const DAY_KEYFRAMES: TimelineKeyframe[] = [
  kf("06:30", "😴", "수면 중", "청소 대기 — 조용 모드",
    { current_time: "06:30", sleep_time: SLEEP, user_location: "bedroom", active_events: ["pre_sleep_30min"] },
    {
      bed_sensor: { value: 1, label: "재실 (수면)", active: true },
      motion_sensor: { value: 0, label: "감지 없음", active: false },
      tv: { value: 0, label: "꺼짐", active: false },
      air_conditioner: { value: 22, label: "수면 모드 22°C", active: true },
    },
  ),
  kf("07:00", "⏰", "기상 — 침대 이탈 감지", "침실 환기 청소 준비",
    { current_time: "07:00", sleep_time: SLEEP, user_location: "bedroom", active_events: [] },
    {
      bed_sensor: { value: 0, label: "비움", active: true },
      motion_sensor: { value: 1, label: "침실 감지", active: true },
      door_lock: { value: 1, label: "잠김", active: false },
    },
  ),
  kf("08:00", "🚪", "외출 — 문 잠김 감지", "거실부터 전체 청소 시작",
    { current_time: "08:00", sleep_time: SLEEP, user_location: null, active_events: ["user_left"] },
    {
      door_lock: { value: 0, label: "잠김 (외부)", active: true },
      motion_sensor: { value: 0, label: "감지 없음", active: true },
      bed_sensor: { value: 0, label: "비움", active: false },
      air_conditioner: { value: 0, label: "꺼짐", active: false },
    },
  ),
  kf("12:00", "📦", "택배 알림 — 현관 센서 반응", "현관 우선 청소 전환",
    { current_time: "12:00", sleep_time: SLEEP, user_location: null, active_events: ["user_left"] },
    {
      door_lock: { value: 1, label: "택배 알림", active: true },
      motion_sensor: { value: 1, label: "현관 감지", active: true },
      calendar: { value: 0, label: "일정 없음", active: false },
    },
  ),
  kf("17:30", "🏠", "귀가 — 문 열림 감지", "현관 먼지 제거 우선",
    { current_time: "17:30", sleep_time: SLEEP, user_location: "entrance", active_events: ["user_returned"] },
    {
      door_lock: { value: 1, label: "열림 (내부)", active: true },
      motion_sensor: { value: 1, label: "현관 감지", active: true },
      air_conditioner: { value: 24, label: "냉방 24°C", active: true },
    },
  ),
  kf("18:00", "🍳", "요리 시작 — 인덕션 가동", "주방 제외, 거실·침실 청소",
    { current_time: "18:00", sleep_time: SLEEP, user_location: "kitchen", active_events: ["cooking_active"] },
    {
      induction: { value: 1800, label: "가열 중 1800W", active: true },
      refrigerator: { value: 5, label: "5회/h 열림", active: true },
      motion_sensor: { value: 1, label: "주방 감지", active: true },
      humidity: { value: 55, label: "55% RH", active: true },
    },
  ),
  kf("18:40", "✅", "요리 완료 — 인덕션 꺼짐", "주방 우선 청소 전환",
    { current_time: "18:40", sleep_time: SLEEP, user_location: "living", active_events: ["cooking_done"] },
    {
      induction: { value: 0, label: "꺼짐 (2분 전)", active: true },
      refrigerator: { value: 1, label: "1회/h", active: true },
      motion_sensor: { value: 1, label: "거실 감지", active: true },
      humidity: { value: 48, label: "48% RH", active: true },
    },
  ),
  kf("20:30", "🌧️", "비 시작 + TV 시청", "현관 습기 청소, 거실 조용 모드",
    { current_time: "20:30", sleep_time: SLEEP, user_location: "living", active_events: ["rain", "tv_watching"] },
    {
      weather_api: { value: 1, label: "비 3mm/h", active: true },
      tv: { value: 1, label: "시청 중 45분", active: true },
      motion_sensor: { value: 1, label: "거실 감지", active: true },
      humidity: { value: 65, label: "65% RH (외부)", active: true },
    },
  ),
  kf("22:00", "🚿", "샤워 직후 — 습도 급등", "욕실 환기 대기, 침실 준비 청소",
    { current_time: "22:00", sleep_time: SLEEP, user_location: "bathroom", active_events: ["recent_shower", "pre_sleep_2h"] },
    {
      humidity: { value: 85, label: "85% RH (샤워)", active: true },
      motion_sensor: { value: 1, label: "욕실 감지", active: true },
      bed_sensor: { value: 0, label: "비움", active: true },
      tv: { value: 0, label: "꺼짐", active: false },
    },
  ),
  kf("22:30", "🌙", "취침 준비 — 침대 감지", "침실 조용 모드 전환, 청소 마무리",
    { current_time: "22:30", sleep_time: SLEEP, user_location: "bedroom", active_events: ["pre_sleep_30min"] },
    {
      bed_sensor: { value: 1, label: "재실 (준비)", active: true },
      motion_sensor: { value: 1, label: "침실 감지", active: true },
      air_conditioner: { value: 22, label: "수면 모드 22°C", active: true },
      tv: { value: 0, label: "꺼짐", active: false },
      induction: { value: 0, label: "꺼짐", active: false },
    },
  ),
];
