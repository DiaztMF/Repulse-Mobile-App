/** One color per metric, consistent from chip to chart to timeline.
 *  Import from here — never write a hex in a component. */
export type MetricKey = "pulse" | "sleep" | "breath" | "room" | "intervention";

export const METRIC_COLOR: Record<MetricKey, string> = {
  pulse: "#e8a33d",
  sleep: "#d0a17a",
  breath: "#c9846b",
  room: "#8c8175",
  intervention: "#3d2e1c",
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
  good: "#f0b65c",
  fair: "#b98243",
  poor: "#b4522f",
};

export const BAND_LABEL: Record<Band, string> = {
  good: "BAIK",
  fair: "CUKUP",
  poor: "KURANG",
};
