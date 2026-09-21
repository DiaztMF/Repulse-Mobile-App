/* Relative, with the extension: node's type stripper runs the check files
 * and cannot resolve Vite's `@` alias for a value import. Same reason
 * night.ts reaches for ../lib/screening.ts. */
import { DEFAULT_NOISE_LEVEL, type NoiseLevel } from "../lib/noise.ts";
import type { Actuator } from "@/ble/transport";

/**
 * The comfort system's state machine. PRD §4 and §5.
 *
 * A pure reducer on purpose. Every rule below is one the product's claims
 * rest on, and rules that live inside a React component can only be tested
 * by driving a UI — which is how "anomaly during sunrise" ends up never
 * being tested at all.
 *
 * What this does NOT own: the escalation ladder. §4.1's first exception
 * hands that to the band's firmware, running whether a phone is present or
 * not, because a safety feature must not have a phone battery as its
 * single point of failure. Stages arrive here already decided.
 */

/** §4.2, in priority order. Lower number wins. */
export type Phase =
  | "ALERT"
  | "SOS_SENT"
  | "WAKE_WINDOW"
  | "COMFORT"
  | "MONITORING"
  | "WIND_DOWN"
  | "STANDBY";

export const PRIORITY: Record<Phase, number> = {
  ALERT: 1,
  SOS_SENT: 1,
  WAKE_WINDOW: 2,
  COMFORT: 3,
  MONITORING: 4,
  WIND_DOWN: 5,
  STANDBY: 6,
};

export type Intervention = "white_noise" | "aroma" | "light";

/** §7.1. Exactly one of these per COMFORT event, no more and no fewer. */
export type VerificationRow = {
  timestamp: string;
  trigger: { movement_g: number; hr: number; baseline_hr: number };
  /** Null where nothing measured it. The bedside can be missing entirely, or
   *  present with no DHT wired, and lux and dB come from other chips again —
   *  so any of the four can be absent on its own. Recording a zero instead
   *  would put a fabricated room condition in the one table §7.1 exists to
   *  make trustworthy. */
  room_state: {
    temp_c: number | null;
    rh: number | null;
    lux: number | null;
    db: number | null;
  };
  intervention: { type: Intervention; volume?: number; track?: number } | null;
  settle_time_s: number | null;
  result: "berhasil" | "gagal" | null;
  /** §5.3: an event with no bedside is not a failed intervention, and
   *  counting it as one poisons the learning loop with a failure that
   *  belongs to a power cable. */
  bedside_offline: boolean;
};

export type Machine = {
  phase: Phase;
  /** Where to fall back to when the ladder stands down. §4.3: a body that
   *  responds returns to the previous state and is logged as an ordinary
   *  warning — it does not end the night. */
  resume: Phase | null;
  stage: 0 | 1 | 2 | 3 | 4;
  /** §3.5. Kenapa tangga ini naik — layar ALERT mengatakannya kepada
   *  orangnya, dan "tidak teratur" tidak sama dengan "di luar ambang". */
  reason: "none" | "irregular" | "threshold" | "manual";
  /** Set while a COMFORT check window is open. §5.3 gives it five
   *  minutes. */
  comfort: {
    startedAt: number;
    intervention: Intervention | null;
    /** §5.3 allows exactly one other intervention after a failure. */
    retried: boolean;
    row: VerificationRow;
  } | null;
  sessionStartedAt: number | null;
  bedsideOnline: boolean;
  bandOnline: boolean;
  /** §5.5. Not a phase — monitoring continues — so it rides alongside. */
  reconstructing: boolean;
  rows: VerificationRow[];
};

export const initial: Machine = {
  phase: "STANDBY",
  resume: null,
  stage: 0,
  reason: "none",
  comfort: null,
  sessionStartedAt: null,
  bedsideOnline: true,
  bandOnline: true,
  reconstructing: false,
  rows: [],
};

export type Input =
  | { t: "start-sleep"; at: number }
  | { t: "sunset-due"; at: number }
  | { t: "asleep"; at: number }
  | { t: "wake-window"; at: number }
  | { t: "session-end"; at: number; reason: "wake" | "band-off" | "activity" }
  | {
      t: "restless";
      at: number;
      movementG: number;
      hr: number;
      baselineHr: number;
      room: VerificationRow["room_state"];
    }
  /** What was actually tried. The chooser lives outside the reducer —
   *  §7.2 needs the account's history and the reducer is pure — but the
   *  row cannot be written without knowing which one it was. */
  | { t: "chose"; intervention: Intervention; volume?: number; track?: number }
  | { t: "settled"; at: number }
  | { t: "stage"; at: number; stage: 0 | 1 | 2 | 3 | 4; reason?: Machine["reason"] }
  | { t: "link"; device: "band" | "bedside"; up: boolean }
  | { t: "tick"; at: number };

/** §5.3. Five minutes to decide whether an intervention worked. */
export const CHECK_WINDOW_MS = 5 * 60_000;

/** §5.2. Shorter than this is recorded but never scored. */
export const MIN_SCORED_SESSION_MS = 2 * 60 * 60_000;

export function reduce(m: Machine, i: Input): Machine {
  switch (i.t) {
    // --- the ladder, which we mirror and never drive -------------------
    case "stage": {
      if (i.stage === 0) {
        // Stood down. Back where we were, and nobody is called.
        //
        // SOS_SENT belongs here too. Leaving it out meant nothing could
        // ever leave that phase — not a body answering late, not the
        // person tapping "I am okay" — so the screen threw them straight
        // back at the emergency they had just dismissed.
        if (m.phase !== "ALERT" && m.phase !== "SOS_SENT")
          return { ...m, stage: 0, reason: "none" };
        return { ...m, stage: 0, reason: "none", phase: m.resume ?? "MONITORING", resume: null };
      }
      const why = i.reason ?? m.reason;
      if (i.stage === 4) {
        /* `resume` harus ikut disimpan di sini juga.
         *
         * Tahap 4 bisa datang LANGSUNG — tombol SOS di pergelangan, atau
         * panel uji — tanpa melewati ALERT. Dulu jalur itu tidak menyimpan
         * ke mana harus kembali, jadi `resume` tetap null, dan menekan
         * "saya baik-baik saja" mendarat di MONITORING: seluruh antarmuka
         * berubah gelap untuk malam yang tidak pernah dimulai, tema tidak
         * bisa diganti karena mode malam memaksanya, dan satu-satunya jalan
         * keluar adalah menekan "End session" di panel uji untuk sesi yang
         * tidak ada. */
        return {
          ...m,
          stage: 4,
          reason: why,
          phase: "SOS_SENT",
          resume:
            m.phase === "ALERT" || m.phase === "SOS_SENT" ? m.resume : m.phase,
          comfort: null,
        };
      }
      // Rule 2: ALERT outranks everything, so whatever was running stops.
      // Rule 3's actuator flip falls out of the phase change by itself.
      if (m.phase === "ALERT" || m.phase === "SOS_SENT")
        return { ...m, stage: i.stage, reason: why };
      return {
        ...m,
        stage: i.stage,
        reason: why,
        phase: "ALERT",
        resume: m.phase,
        comfort: null,
      };
    }

    case "link": {
      const next =
        i.device === "band" ? { bandOnline: i.up } : { bedsideOnline: i.up };
      return { ...m, ...next, reconstructing: i.device === "band" && i.up ? true : m.reconstructing };
    }

    // --- ordinary night ------------------------------------------------
    case "sunset-due":
      /* The night starts here, not at `asleep`.
       *
       * `sessionStartedAt` is what the recorder follows, and WIND_DOWN used
       * to leave it null — so a sunset that somebody fell asleep during
       * recorded nothing at all. The lamp dimmed correctly and the morning
       * had no night in it. The sunset is the first 25 minutes of the
       * night, so it is counted as such. */
      return m.phase === "STANDBY"
        ? { ...m, phase: "WIND_DOWN", sessionStartedAt: m.sessionStartedAt ?? i.at }
        : m;

    case "start-sleep":
      // §5.1: the tap is an override, not the normal way in. It skips the
      // sunset entirely, because someone tapping it is already in bed.
      return PRIORITY[m.phase] >= PRIORITY.WIND_DOWN
        ? { ...m, phase: "MONITORING", sessionStartedAt: i.at }
        : m;

    case "asleep":
      return m.phase === "WIND_DOWN"
        ? { ...m, phase: "MONITORING", sessionStartedAt: m.sessionStartedAt ?? i.at }
        : m;

    case "wake-window":
      // Outranks COMFORT and MONITORING, never ALERT.
      return PRIORITY[m.phase] > PRIORITY.WAKE_WINDOW
        ? { ...m, phase: "WAKE_WINDOW", comfort: null }
        : m;

    case "session-end":
      return PRIORITY[m.phase] >= PRIORITY.WAKE_WINDOW
        ? { ...m, phase: "STANDBY", comfort: null, sessionStartedAt: null }
        : m;

    // --- restlessness and the check window -----------------------------
    case "restless": {
      if (m.phase !== "MONITORING") return m;
      const row: VerificationRow = {
        timestamp: new Date(i.at).toISOString(),
        trigger: { movement_g: i.movementG, hr: i.hr, baseline_hr: i.baselineHr },
        room_state: i.room,
        intervention: null,
        settle_time_s: null,
        result: null,
        bedside_offline: !m.bedsideOnline,
      };
      return {
        ...m,
        phase: "COMFORT",
        comfort: { startedAt: i.at, intervention: null, retried: false, row },
      };
    }

    case "chose": {
      if (m.phase !== "COMFORT" || !m.comfort) return m;
      const intervention = {
        type: i.intervention,
        ...(i.volume !== undefined ? { volume: i.volume } : {}),
        ...(i.track !== undefined ? { track: i.track } : {}),
      };
      return {
        ...m,
        comfort: {
          ...m.comfort,
          intervention: i.intervention,
          row: { ...m.comfort.row, intervention },
        },
      };
    }

    case "settled": {
      if (m.phase !== "COMFORT" || !m.comfort) return m;
      const row: VerificationRow = {
        ...m.comfort.row,
        settle_time_s: Math.round((i.at - m.comfort.startedAt) / 1000),
        // §5.3: with no bedside there was no intervention, so there is
        // nothing to call successful — the body settled on its own.
        result: m.comfort.row.bedside_offline ? null : "berhasil",
      };
      return { ...m, phase: "MONITORING", comfort: null, rows: [...m.rows, row] };
    }

    case "tick": {
      if (m.phase !== "COMFORT" || !m.comfort) return m;
      if (i.at - m.comfort.startedAt < CHECK_WINDOW_MS) return m;
      if (!m.comfort.retried && !m.comfort.row.bedside_offline) {
        // One more try, one time only.
        return {
          ...m,
          comfort: { ...m.comfort, startedAt: i.at, retried: true, intervention: null },
        };
      }
      const row: VerificationRow = {
        ...m.comfort.row,
        settle_time_s: Math.round((i.at - m.comfort.startedAt) / 1000),
        result: m.comfort.row.bedside_offline ? null : "gagal",
      };
      return { ...m, phase: "MONITORING", comfort: null, rows: [...m.rows, row] };
    }
  }
}

/**
 * §4.4, the actuator matrix — and Rule 3, which is the whole point of it.
 *
 * White noise exists to mask sound. That means during an emergency our own
 * device would be hiding the gasping from everyone else in the house. And
 * a calming scent is the last thing a room needs when someone in it has to
 * be woken. So at the top of the ladder every actuator does the opposite
 * of its day job.
 */
export function actuatorsFor(
  phase: Phase,
  /* Only COMFORT honours it. SOS_SENT stays at 3 whatever the sleeper
   * prefers — that row exists to wake a household, and a volume nobody
   * remembers setting is not allowed to quieten it. */
  comfortNoise: NoiseLevel = DEFAULT_NOISE_LEVEL,
): Actuator[] {
  switch (phase) {
    case "ALERT":
      return [
        { kind: "noise", level: 0 },
        { kind: "aroma", seconds: 0 },
        { kind: "light", mode: "amber-dim" },
      ];
    case "SOS_SENT":
      return [
        { kind: "noise", level: 3 },
        { kind: "siren", on: true },
        { kind: "aroma", seconds: 0 },
        { kind: "light", mode: "white-flash" },
      ];
    case "COMFORT":
      // The light stays off. Any light suppresses melatonin, so switching
      // it on during COMFORT defeats the intervention it belongs to —
      // this row is not a typo, it is the finding.
      return [
        { kind: "noise", level: comfortNoise },
        { kind: "aroma", seconds: 25 },
        { kind: "light", mode: "off" },
      ];
    case "WIND_DOWN":
      return [{ kind: "light", mode: "sunset" }, { kind: "noise", level: 0 }];
    case "MONITORING":
    case "WAKE_WINDOW":
    case "STANDBY":
      return [
        { kind: "noise", level: 0 },
        { kind: "aroma", seconds: 0 },
        { kind: "light", mode: "off" },
        { kind: "siren", on: false },
      ];
  }
}

/**
 * §7.2. A counter, not a model.
 *
 * `explore` is injected rather than called from `Math.random` inside, so
 * the rule can be tested instead of hoped about.
 */
export function chooseIntervention(
  scores: Record<Intervention, { tried: number; worked: number }>,
  explore: () => boolean,
  order: Intervention[] = ["white_noise", "aroma", "light"],
): Intervention {
  const eligible = order.filter((i) => (scores[i]?.tried ?? 0) >= 3);
  if (eligible.length === 0) return order[0]!;

  const ranked = [...eligible].sort(
    (a, b) => scores[b]!.worked / scores[b]!.tried - scores[a]!.worked / scores[a]!.tried,
  );
  // One in five goes to the runner-up, or the first thing that ever works
  // stays the only thing ever tried.
  if (ranked.length > 1 && explore()) return ranked[1]!;
  return ranked[0]!;
}
