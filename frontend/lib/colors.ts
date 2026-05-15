import type { Mode } from "./types";

export function scoreToFill(score: number, mode: Mode): string {
  if (mode === "excluded") return "url(#hatch)";
  if (score <= 0) return "oklch(97% 0 0)";
  const clamped = Math.min(80, Math.max(0, score));
  const lightness = 96 - (clamped / 80) * 30;
  return `oklch(${lightness}% 0 0)`;
}

export const MODE_BADGE: Record<
  Mode,
  { label: string; prefix: string; cls: string }
> = {
  normal: {
    label: "일반",
    prefix: "○",
    cls: "bg-blue-50 text-blue-700 border border-blue-700/20",
  },
  quiet: {
    label: "저소음",
    prefix: "◐",
    cls: "bg-purple-50 text-purple-700 border border-purple-700/30 ring-1 ring-purple-700/10",
  },
  delayed: {
    label: "지연",
    prefix: "⏱",
    cls: "bg-orange-50 text-orange-700 border border-orange-700/30 ring-1 ring-orange-700/10",
  },
  excluded: {
    label: "제외",
    prefix: "✕",
    cls: "bg-gray-100 text-gray-600 border border-gray-300",
  },
};
