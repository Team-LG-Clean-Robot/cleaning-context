/* 인라인 SVG 아이콘 — 이모지 대체. 모두 currentColor, em 기반 크기.
 * 사용처: DecisionHero · ScenarioPanel · ExplanationCard · ThemeToggle ·
 *        RoomDetail · TimelinePanel · PipelinePanel
 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ClockIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function MoonIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z" />
    </svg>
  );
}

export function SunIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function PinIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function ShieldIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function PlayIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

export function PauseIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
      <rect x="14" y="5" width="3.5" height="14" rx="1" />
    </svg>
  );
}

export function BookIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 6.5C10.5 5.2 8.5 4.5 4 4.5v13c4.5 0 6.5.7 8 2 1.5-1.3 3.5-2 8-2v-13c-4.5 0-6.5.7-8 2z" />
      <path d="M12 6.5v12" />
    </svg>
  );
}

export function RobotIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="5" y="8" width="14" height="10" rx="2.5" />
      <path d="M12 8V4.5M12 4.5h1.5" />
      <circle cx="9.2" cy="13" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="13" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AntennaIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 14v6M8 20h8" />
      <path d="M8.5 11a5 5 0 0 1 7 0M6 8.5a8.5 8.5 0 0 1 12 0" />
      <circle cx="12" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChipIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M10 2.5V5M14 2.5V5M10 19v2.5M14 19v2.5M2.5 10H5M2.5 14H5M19 10h2.5M19 14h2.5" />
    </svg>
  );
}

export function GlobeIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  );
}

export function ChartIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function ChatIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M20 15.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z" />
    </svg>
  );
}

export function FlowIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="3" y="4" width="7" height="5" rx="1.5" />
      <rect x="14" y="15" width="7" height="5" rx="1.5" />
      <path d="M6.5 9v4.5a2 2 0 0 0 2 2H14" />
    </svg>
  );
}

/* ── 하루 시뮬레이션 키프레임 상황 아이콘 ── */
export function BedIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M3 18v-9" />
      <path d="M3 14h13a4 4 0 0 1 4 4v0M3 18h18" />
      <path d="M7 14v-1.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V14" />
    </svg>
  );
}

export function DoorIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
      <path d="M4 21h16" />
      <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PackageIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </svg>
  );
}

export function HomeIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function CookIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M5 11h14v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" />
      <path d="M3 11h18" />
      <path d="M9.5 7c0-1 .8-1.3.8-2.5M14.5 7c0-1 .8-1.3.8-2.5" />
    </svg>
  );
}

export function CheckCircleIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </svg>
  );
}

export function RainIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1.5A3.5 3.5 0 0 1 17 15z" />
      <path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5" />
    </svg>
  );
}

export function DropletIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
    </svg>
  );
}
