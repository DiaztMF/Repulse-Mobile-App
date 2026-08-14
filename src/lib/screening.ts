import type { Motion, Oxygen, Room, Vitals } from "@/ble/transport";

/**
 * Breathing screening and darkness verification. PRD §8.
 *
 * Thresholds, not machine learning — §8 says so outright, and a threshold
 * that can be read and argued with is worth more here than a model nobody
 * can inspect. Everything below is a pure function over samples so the
 * numbers behind a screening sentence can be checked without a night's
 * sleep.
 *
 * §8.2 is the reason this exists: no single device can do it. The snoring
 * is in the room, the oxygen and the position are on the body, and the two
 * only meet in the app.
 *
 * It is passive. It drives no actuator, wakes nobody, and never enters the
 * escalation ladder — §8.2, final paragraph. Its only output is a report.
 */

// --- §8.2 desaturation ---------------------------------------------------

/** A drop of at least this much from the sleeping baseline counts. */
export const DESAT_DROP_PCT = 3;
/** ...and it has to hold this long, or a single bad sample is an event. */
export const DESAT_HOLD_MS = 10_000;

export type Desaturation = { from: number; to: number; lowest: number; position: Oxygen["position"] };

/**
 * Counts desaturation events against a sleeping baseline.
 *
 * Samples arrive every 10-30s (§8.2 forbids continuous sampling — it costs
 * battery for nothing), so "held for 10 seconds" usually means two
 * consecutive readings rather than a dense run.
 */
export function desaturations(samples: Oxygen[], baselinePct: number): Desaturation[] {
  const out: Desaturation[] = [];
  let open: { from: number; lowest: number; position: Oxygen["position"] } | null = null;

  for (const s of samples) {
    // 0 is "not valid", never "zero percent" — a finger that moved is not
    // a person who stopped breathing.
    if (s.spo2Pct === 0) continue;
    const low = s.spo2Pct <= baselinePct - DESAT_DROP_PCT;

    if (low) {
      open ??= { from: s.at, lowest: s.spo2Pct, position: s.position };
      open.lowest = Math.min(open.lowest, s.spo2Pct);
      continue;
    }
    if (open) {
      if (s.at - open.from >= DESAT_HOLD_MS) {
        out.push({ from: open.from, to: s.at, lowest: open.lowest, position: open.position });
      }
      open = null;
    }
  }
  return out;
}

/** §8.2 reports this per hour of sleep, not per night. A long night and a
 *  short one are not comparable any other way. */
export function desatPerHour(events: Desaturation[], sleepMs: number): number {
  if (sleepMs <= 0) return 0;
  return +(events.length / (sleepMs / 3_600_000)).toFixed(1);
}

/**
 * §8.2's whole claim: three signals at once, repeatedly. One of them alone
 * is a person who snores, or a finger that slipped. Together and recurring
 * is the thing worth having looked at.
 *
 * Deliberately conservative. This sentence is the most consequential thing
 * the app ever says, and §12 binds its wording precisely because a false
 * one sends someone to a doctor for nothing.
 */
export function screeningFlag(opts: {
  desatPerHour: number;
  snoreMinutes: number;
  sleepMinutes: number;
}): boolean {
  const enoughSleep = opts.sleepMinutes >= 120;
  const snoredMuch = opts.snoreMinutes >= 0.2 * opts.sleepMinutes;
  return enoughSleep && opts.desatPerHour >= 5 && snoredMuch;
}

/** Which position the events cluster in. §3.2 forbids merging left and
 *  right — the weekly summary has to name the position, and without the
 *  split that report cannot be written at all. */
export function worstPosition(events: Desaturation[]): Oxygen["position"] | null {
  const tally = new Map<Oxygen["position"], number>();
  for (const e of events) tally.set(e.position, (tally.get(e.position) ?? 0) + 1);
  let best: Oxygen["position"] | null = null;
  let n = 0;
  for (const [p, c] of tally) if (c > n) ((best = p), (n = c));
  return best;
}

// --- §8.3 darkness -------------------------------------------------------

export const DARK_OPTIMAL_LUX = 3;
export const POLLUTION_LUX = 5;

/**
 * Minutes spent genuinely dark, and minutes of light pollution.
 *
 * The system reports and never corrects. §8.3: switching a lamp on to
 * announce that there is too much light is self-defeating, and that rule
 * belongs next to the code that could most easily break it.
 */
export function darkness(samples: Room[]): {
  darkOptimalMin: number;
  pollutionMin: number;
} {
  let dark = 0;
  let polluted = 0;
  for (let i = 1; i < samples.length; i++) {
    const minutes = (samples[i]!.at - samples[i - 1]!.at) / 60_000;
    const lux = samples[i - 1]!.lux;
    if (lux < DARK_OPTIMAL_LUX) dark += minutes;
    else if (lux > POLLUTION_LUX) polluted += minutes;
  }
  return { darkOptimalMin: Math.round(dark), pollutionMin: Math.round(polluted) };
}

// --- §8.1 sleep staging --------------------------------------------------

export type Stage = "awake" | "light" | "deep" | "rem";

/**
 * §8.1 is explicit: **do not use movement alone.** Movement plus the
 * variability of the RR intervals is how modern wearables do it, and it
 * needs no component the band does not already have.
 *
 * Coarse on purpose. A four-way split that is honest beats a finer one
 * invented to look sophisticated on a chart.
 */
export function stageOf(motion: Motion[], vitals: Vitals[]): Stage {
  if (motion.length === 0 || vitals.length === 0) return "awake";
  const avgMg = motion.reduce((s, m) => s + m.levelMg, 0) / motion.length;
  if (avgMg > 300) return "awake";

  const rr = vitals.map((v) => v.rrMs);
  const mean = rr.reduce((s, r) => s + r, 0) / rr.length;
  const sd = Math.sqrt(rr.reduce((s, r) => s + (r - mean) ** 2, 0) / rr.length);

  // High variability with a still body is REM; low variability is deep.
  if (sd > 60) return "rem";
  if (sd < 25 && avgMg < 80) return "deep";
  return "light";
}

/** §8.1. A rolling mean over previous nights, not tonight — a baseline
 *  that includes the night being judged moves to meet it. */
export function sleepingBaseline(previousNightRestingBpm: number[]): number | null {
  if (previousNightRestingBpm.length === 0) return null;
  const recent = previousNightRestingBpm.slice(-7);
  return Math.round(recent.reduce((s, b) => s + b, 0) / recent.length);
}
