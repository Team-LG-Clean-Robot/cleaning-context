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
    cls: "bg-white text-text-default border border-border-default",
  },
  quiet: {
    label: "저소음",
    prefix: "◐",
    cls: "bg-surface-muted text-text-default border border-border-default",
  },
  delayed: {
    label: "지연",
    prefix: "⏱",
    cls: "bg-surface-muted text-text-default border border-dashed border-text-muted",
  },
  excluded: {
    label: "제외",
    prefix: "✕",
    cls: "bg-surface-muted text-text-muted border border-border-default",
  },
};
