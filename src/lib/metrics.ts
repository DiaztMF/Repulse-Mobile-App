/** One color per metric, consistent from chip to chart to timeline.
 *  Import from here — never write a hex in a component. */
export type MetricKey = "pulse" | "sleep" | "breath" | "room" | "intervention";

export const METRIC_COLOR: Record<MetricKey, string> = {
  pulse: "var(--color-pulse)",
  sleep: "var(--color-sleep)",
  breath: "var(--color-breath)",
  room: "var(--color-room)",
  intervention: "var(--color-faint)",
};

export type Band = "good" | "fair" | "poor";

export function bandOf(score: number): Band {
  if (score >= 80) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

/** Rust for the low band, not the danger red — that one is reserved
 *  for ALERT and SOS and stops meaning anything if reused. */
export const BAND_COLOR: Record<Band, string> = {
  good: "var(--color-band-good)",
  fair: "var(--color-band-fair)",
  poor: "var(--color-band-poor)",
};

export const BAND_LABEL: Record<Band, string> = {
  good: "GOOD",
  fair: "FAIR",
  poor: "POOR",
};
