/**
 * The personal resting pulse, and where it lives.
 *
 * §3.1: every personal threshold for the next fortnight is measured
 * against the figure calibration records. Until now the app carried a
 * number picked at a desk — `TUNING.baselineBpm`, 62 — and the
 * calibration screen printed that same 62 on screen whatever the wrist
 * under it was doing, alongside the words "Saved to the band".
 *
 * Device-local on purpose. The band keeps its own copy in config so the
 * escalation ladder works with no phone present (§3.7), and this side
 * only needs it to decide what counts as restless. Two copies of one
 * number, each where the decision using it is made.
 */
const KEY = "repulse.baselineBpm";

/** Plausible for a sleeping adult, and only ever a stand-in. Anything
 *  derived from it is a guess about a stranger. */
export const DEFAULT_BASELINE_BPM = 62;

export function readBaseline(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    const n = raw === null ? NaN : Number(raw);
    // A stored zero would silently make every heartbeat an anomaly.
    return Number.isFinite(n) && n >= 30 && n <= 120 ? n : null;
  } catch {
    return null;
  }
}

export function writeBaseline(bpm: number) {
  try {
    localStorage.setItem(KEY, String(bpm));
  } catch {
    // A baseline that cannot be stored is not worth failing calibration
    // over; the band has its own copy, and the default still works.
  }
}
