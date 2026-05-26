"use client";

const ICONS: Record<string, React.JSX.Element> = {
  door_lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x={5} y={11} width={14} height={11} rx={2} />
      <path d="M12 16v2" />
      <circle cx={12} cy={16} r={1} fill="currentColor" />
      <path d="M8 11V7a4 4 0 118 0v4" />
    </svg>
  ),
  induction: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={14} width={18} height={6} rx={1} />
      <circle cx={9} cy={17} r={1.5} />
      <circle cx={15} cy={17} r={1.5} />
      <path d="M8 10c0-2 2-4 4-2s4 0 4-2" />
    </svg>
  ),
  microwave: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x={2} y={6} width={20} height={13} rx={2} />
      <rect x={5} y={9} width={11} height={7} rx={1} />
      <line x1={19} y1={10} x2={19} y2={10.01} />
      <line x1={19} y1={13} x2={19} y2={13.01} />
    </svg>
  ),
  refrigerator: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x={5} y={2} width={14} height={20} rx={2} />
      <line x1={5} y1={10} x2={19} y2={10} />
      <line x1={16} y1={6} x2={16} y2={8} />
      <line x1={16} y1={13} x2={16} y2={16} />
    </svg>
  ),
  air_conditioner: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x={2} y={4} width={20} height={10} rx={2} />
      <path d="M6 11h12" />
      <path d="M8 18c0-2 2-2 4-4" />
      <path d="M12 14c2 2 4 2 4 4" />
    </svg>
  ),
  tv: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x={2} y={5} width={20} height={13} rx={2} />
      <line x1={8} y1={21} x2={16} y2={21} />
      <line x1={12} y1={18} x2={12} y2={21} />
    </svg>
  ),
  bed_sensor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20v-8a2 2 0 012-2h14a2 2 0 012 2v8" />
      <rect x={3} y={14} width={18} height={6} />
      <path d="M3 14V8a2 2 0 012-2h3a2 2 0 012 2v6" />
      <circle cx={7} cy={8} r={1} fill="currentColor" />
    </svg>
  ),
  motion_sensor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={12} cy={12} r={3} />
      <circle cx={12} cy={12} r={7} strokeDasharray="3 3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  ),
  humidity_bath: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c-4 6-7 9-7 13a7 7 0 1014 0c0-4-3-7-7-13z" />
      <path d="M9 16a3 3 0 003 3" />
    </svg>
  ),
  smart_speaker: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x={7} y={4} width={10} height={16} rx={5} />
      <circle cx={12} cy={14} r={2} />
      <path d="M10 8h4" />
    </svg>
  ),
  weather_api: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 18a5 5 0 00.5-9.97A7 7 0 103.5 16.5" />
      <path d="M8 19v2M12 19v2M16 19v2" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={4} width={18} height={18} rx={2} />
      <line x1={16} y1={2} x2={16} y2={6} />
      <line x1={8} y1={2} x2={8} y2={6} />
      <line x1={3} y1={10} x2={21} y2={10} />
      <circle cx={12} cy={16} r={1} fill="currentColor" />
    </svg>
  ),
};

export function SensorIcon({ sensorId, className }: { sensorId: string; className?: string }) {
  const icon = ICONS[sensorId];
  if (!icon) return null;
  return <span className={`inline-block ${className ?? "w-5 h-5 text-text-muted"}`}>{icon}</span>;
}
