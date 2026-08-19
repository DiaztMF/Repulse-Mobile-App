/**
 * Synthetic nights, shaped exactly like the Firestore schema so screens
 * built on top of this keep working when the real data lands.
 *
 * Deterministic on purpose: the same seed produces the same fortnight
 * every run, so screenshots are stable and a demo can be rehearsed.
 */

// --- shapes ---------------------------------------------------------

export type Band = "good" | "fair" | "poor";

export type Contributor = {
  key: string;
  label: string;
  /** Human-readable value, already formatted. */
  value: string;
  /** Points this pushed the score by. Negative lowers it. */
  delta: number;
};

export type NightEvent = {
  id: string;
  type: "comfort" | "anomaly" | "desaturation" | "snore" | "light_pollution";
  /** Minutes after sleep start. */
  at: number;
  title: string;
  /** Present on comfort events only. */
  intervention?: InterventionKey;
  settleSec?: number | null;
  /** True when reconstructed from the band buffer rather than watched live. */
  offline?: boolean;
};

export type Night = {
  date: string;
  /** Null when the band was not worn — the room data still exists. */
  score: number | null;
  /** Staged by `screening.stageOf` on a measured night: §8.1's coarse
   *  four-way split from movement and RR spread, deliberately not finer. */
  sleep: { startMin: number; durationMin: number; deep: number; light: number; rem: number; awake: number };
  heart: { avg: number; min: number; max: number; resting: number; hrv: number };
  /** Null per field: the bedside can be absent, or present with no DHT, and
   *  lux and dB come from chips of their own. */
  room: { tempC: number | null; rh: number | null; lux: number | null; db: number | null };
  light: { darkOptimalMin: number; pollutionMin: number };
  breathing: { desatPerHour: number; snoreMin: number; spo2DeltaPct: number };
  counts: { restless: number; anomaly: number; offlineMin: number };
  positions: Record<"supine" | "left" | "right" | "prone", number>;
  contributors: Contributor[];
  events: NightEvent[];
  insight: string;
  /**
   * Stamped by the seeder. Once a synthetic fortnight is written to
   * Firestore it arrives back through the same path as measured data, and
   * without this the app would present invented numbers as real ones —
   * which is exactly what the SAMPLE DATA badge exists to prevent.
   */
  seeded?: boolean;
};

export type InterventionKey = "white_noise" | "aroma" | "dim_light" | "cooling";

export type Intervention = {
  key: InterventionKey;
  label: string;
  tries: number;
  success: number;
  avgSettleSec: number;
};

// --- deterministic noise --------------------------------------------

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bandOfScore(score: number): Band {
  if (score >= 80) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

const INTERVENTION_LABEL: Record<InterventionKey, string> = {
  white_noise: "White noise",
  aroma: "Aroma",
  dim_light: "Dim light",
  cooling: "Cooling",
};

// --- generation -----------------------------------------------------

/** Anchored so the fortnight always ends "today" wherever it is run. */
function dateKey(daysAgo: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function buildNight(daysAgo: number): Night {
  const r = rng(1000 + daysAgo);
  const date = dateKey(daysAgo);

  // Night 3 has no band data, so the empty hero is reachable in the demo.
  const worn = daysAgo !== 3;
  // Night 6 lost the phone mid-way; its events are reconstructed.
  const offlineMin = daysAgo === 6 ? 148 : 0;
  // Two nights carry a breathing signal, enough for a weekly trend.
  const heavyBreathing = daysAgo === 1 || daysAgo === 8;

  const durationMin = worn ? 360 + Math.round(r() * 90) : 0;
  const deep = Math.round(durationMin * (0.17 + r() * 0.05));
  const rem = Math.round(durationMin * (0.2 + r() * 0.05));
  const awake = Math.round(6 + r() * 18);
  const light = durationMin - deep - rem - awake;

  // Resting pulse drifts down slowly across the fortnight.
  const resting = 66 - Math.round((13 - daysAgo) * 0.35) + Math.round(r() * 2 - 1);
  const restless = Math.round(2 + r() * 9);
  const darkOptimalMin = Math.round(durationMin * (0.7 + r() * 0.25));
  const pollutionMin = Math.round(r() * 40);

  const score = worn
    ? Math.max(38, Math.min(94, 62 + Math.round((deep / 60) * 8) - restless + Math.round(r() * 12)))
    : null;

  const contributors: Contributor[] = worn
    ? [
        { key: "duration", label: "Total sleep", value: fmtDur(durationMin), delta: durationMin >= 420 ? 6 : -4 },
        { key: "deep", label: "Deep sleep", value: fmtDur(deep), delta: deep >= 70 ? 5 : -3 },
        { key: "restless", label: "Restlessness", value: `${restless} times`, delta: restless <= 4 ? 4 : -5 },
        { key: "dark", label: "Optimal Darkness", value: fmtDur(darkOptimalMin), delta: pollutionMin < 15 ? 3 : -2 },
      ]
    : [];

  const events: NightEvent[] = [];
  if (worn) {
    const comfortCount = 1 + Math.round(r() * 2);
    for (let i = 0; i < comfortCount; i++) {
      const key = (["white_noise", "aroma", "dim_light", "cooling"] as const)[
        Math.floor(r() * 4)
      ];
      const settled = r() > 0.28;
      events.push({
        id: `${date}-c${i}`,
        type: "comfort",
        at: Math.round(60 + r() * 260),
        title: "Restlessness detected",
        intervention: key,
        settleSec: settled ? Math.round(90 + r() * 240) : null,
        offline: offlineMin > 0 && i === 0,
      });
    }
    if (heavyBreathing) {
      events.push({
        id: `${date}-d0`,
        type: "desaturation",
        at: Math.round(120 + r() * 180),
        title: "Oxygen dipped below your baseline",
      });
      events.push({
        id: `${date}-s0`,
        type: "snore",
        at: Math.round(90 + r() * 200),
        title: "Snoring pattern detected",
      });
    }
    if (pollutionMin > 25) {
      events.push({
        id: `${date}-l0`,
        type: "light_pollution",
        at: Math.round(r() * 40),
        title: "Light leaking into the room",
      });
    }
  }
  events.sort((a, b) => a.at - b.at);

  return {
    date,
    score,
    sleep: { startMin: 22 * 60 + Math.round(r() * 70), durationMin, deep, light, rem, awake },
    heart: {
      avg: resting - 3 + Math.round(r() * 4),
      min: resting - 9,
      max: resting + 22 + Math.round(r() * 10),
      resting,
      hrv: 38 + Math.round(r() * 12),
    },
    room: {
      tempC: Math.round((26.5 + r() * 3) * 10) / 10,
      rh: Math.round(62 + r() * 14),
      lux: Math.round(r() * 6 * 100) / 100,
      db: Math.round(38 + r() * 14),
    },
    light: { darkOptimalMin, pollutionMin },
    breathing: {
      desatPerHour: heavyBreathing ? Math.round((1.6 + r() * 1.4) * 10) / 10 : Math.round(r() * 6) / 10,
      snoreMin: heavyBreathing ? Math.round(22 + r() * 40) : Math.round(r() * 8),
      spo2DeltaPct: heavyBreathing ? -(3 + Math.round(r() * 2)) : -(1 + Math.round(r())),
    },
    counts: { restless, anomaly: daysAgo === 8 ? 1 : 0, offlineMin },
    positions: {
      supine: Math.round(durationMin * 0.3),
      left: Math.round(durationMin * 0.3),
      right: Math.round(durationMin * 0.28),
      prone: Math.round(durationMin * 0.12),
    },
    contributors,
    events,
    insight: worn
      ? pollutionMin > 25
        ? "Light was leaking in for the first half hour. On nights like that you settle about 12 minutes later."
        : "You settled quickly and stayed down. Nothing here needs attention."
      : "The band was not worn, so only the room was recorded.",
  };
}

function fmtDur(min: number) {
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

// --- exports --------------------------------------------------------

/** Index 0 is last night. */
export const NIGHTS: Night[] = Array.from({ length: 14 }, (_, i) => buildNight(i));

export const lastNight = NIGHTS[0]!;

export const nightByDate = (date: string) => NIGHTS.find((n) => n.date === date);

/**
 * Per-minute series, generated on demand rather than held in memory for
 * every night — the same reason Firestore keeps it in a subcollection.
 */
export function seriesFor(date: string) {
  const night = nightByDate(date);
  if (!night || !night.sleep.durationMin) return [];
  const r = rng(date.split("-").reduce((a, p) => a + Number(p), 0));
  const n = Math.round(night.sleep.durationMin);
  return Array.from({ length: n }, (_, i) => {
    const phase = i / n;
    // Pulse dips through the first deep block, lifts toward morning.
    const curve = Math.sin(phase * Math.PI) * -4 + phase * 5;
    return {
      min: i,
      bpm: Math.round(night.heart.resting + curve + (r() * 4 - 2)),
      movement: r() > 0.94 ? Math.round(r() * 60) : Math.round(r() * 8),
      spo2Delta: r() > 0.97 ? night.breathing.spo2DeltaPct : -Math.round(r()),
      lux: i < 25 ? Math.round((night.light.pollutionMin > 25 ? 8 : 1) * r() * 10) / 10 : Math.round(r() * 8) / 10,
      // Synthetic nights always carry a room; a measured one may not, and
      // a series is only drawn for a night that has the field.
      tempC: Math.round(((night.room.tempC ?? 0) + (r() - 0.5)) * 10) / 10,
      db: Math.round((night.room.db ?? 0) + (r() * 8 - 4)),
    };
  });
}

/** Learning loop totals across the fortnight. Minimum three tries before
 *  a score is trusted — below that the screen says so instead. */
export const INTERVENTIONS: Intervention[] = (() => {
  const acc: Record<string, { tries: number; success: number; settle: number[] }> = {};
  for (const night of NIGHTS) {
    for (const e of night.events) {
      if (e.type !== "comfort" || !e.intervention) continue;
      const a = (acc[e.intervention] ??= { tries: 0, success: 0, settle: [] });
      a.tries++;
      if (e.settleSec != null) {
        a.success++;
        a.settle.push(e.settleSec);
      }
    }
  }
  return (Object.keys(INTERVENTION_LABEL) as InterventionKey[]).map((key) => {
    const a = acc[key] ?? { tries: 0, success: 0, settle: [] };
    return {
      key,
      label: INTERVENTION_LABEL[key],
      tries: a.tries,
      success: a.success,
      avgSettleSec: a.settle.length
        ? Math.round(a.settle.reduce((x, y) => x + y, 0) / a.settle.length)
        : 0,
    };
  });
})();

export const formatDuration = fmtDur;
