/**
 * Turns one night of BLE events into the `Night` record every screen
 * already knows how to draw.
 *
 * This is the piece that was missing. `fetchNights` could read, `seed`
 * could write a synthetic fortnight, and `saveVerification` could log a
 * single comfort event — but nothing ever wrote a measured night. With
 * perfect hardware tomorrow, the morning after would still have shown
 * SAMPLE DATA, because nothing had produced anything else.
 *
 * Kept free of React and Firestore so it can be checked in node. A night
 * takes eight hours to happen and the aggregation has exactly one chance
 * to be right.
 *
 * Almost none of the judgement lives here. Staging, darkness, and
 * desaturation are all `screening.ts`, which already carries §8's
 * thresholds and its own check file; this class buffers samples, decides
 * where one window ends and the next begins, and hands them over. A
 * second opinion on any of those numbers is a second answer to a
 * question §8 has already answered once.
 */
import type { BleEvent, Motion, Oxygen, Room, Vitals } from "@/ble/transport";
import {
  darkness,
  desatPerHour,
  desaturations,
  restingFrom,
  stageOf,
  type Stage,
  // Relative, with the extension: this module is pulled into `check:night`
  // by node's type stripper, which erases type-only imports but has to
  // resolve real ones itself and knows nothing of Vite's `@` alias.
} from "../lib/screening.ts";
import type { Contributor, Night, NightEvent } from "./mock";

/**
 * How much night one staging decision covers.
 *
 * §8.1 classifies from average movement and the spread of the RR
 * intervals, so the window has to be long enough for a spread to mean
 * something and short enough that a stage change is not smeared across
 * the whole night. Five minutes is roughly what the sleep literature
 * uses for an epoch-based summary, and at ~1 Hz it is 300 intervals.
 */
const WINDOW_MS = 5 * 60_000;

/** Longer than this between calls and the interval is a gap, not a
 *  reading held steady. Sized against `tick`, not against the radio: a
 *  silent band is exactly the case the ledgers must still advance
 *  through, so the app keeps its own clock running. */
const MAX_SAMPLE_GAP_MS = 30_000;

type Position = keyof Night["positions"];

const POSITIONS: Position[] = ["supine", "left", "right", "prone"];

/** RMSSD, the ordinary short-term HRV figure and the one PPG can
 *  actually support. Successive differences, squared, rooted. */
function rmssd(rr: number[]): number | null {
  if (rr.length < 3) return null;
  let sum = 0;
  for (let i = 1; i < rr.length; i++) sum += (rr[i]! - rr[i - 1]!) ** 2;
  return Math.round(Math.sqrt(sum / (rr.length - 1)));
}

/** The low plateau, not the single lowest beat. One artefact should not
 *  become the night's resting pulse. */
function percentile(sorted: number[], p: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i]!;
}

const fmtDur = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;

export class NightRecorder {
  readonly startedAt: number;
  private lastAt: number;

  private bpm: number[] = [];
  private rr: number[] = [];
  private oxygen: Oxygen[] = [];
  private rooms: Room[] = [];
  private position: Record<Position, number> = { supine: 0, left: 0, right: 0, prone: 0 };

  /** Millisecond ledgers, integrated against elapsed time rather than
   *  counted as samples: notification rates drift, and a dropped
   *  connection must not shorten the night it interrupted. */
  private snoreMs = 0;
  private offlineMs = 0;

  /** The current staging window, and the minutes already filed. */
  private winStart: number;
  private winMotion: Motion[] = [];
  private winVitals: Vitals[] = [];
  private stageMin: Record<Stage, number> = { awake: 0, light: 0, deep: 0, rem: 0 };
  /** Windows that held no samples at all. Not a stage — the absence of one. */
  private unstagedMin = 0;

  private restless = 0;
  private anomaly = 0;

  private snoring = false;
  private bandUp = true;

  private events: NightEvent[] = [];
  private nextId = 0;

  constructor(startedAt: number) {
    this.startedAt = startedAt;
    this.lastAt = startedAt;
    this.winStart = startedAt;
  }

  /** Charges elapsed time to whichever ledgers are open, and closes the
   *  staging window when it is full. Every event calls this first, so the
   *  ledgers always describe the interval that just ended. */
  private advance(at: number) {
    const dt = at - this.lastAt;
    this.lastAt = at;
    if (dt > 0 && dt <= MAX_SAMPLE_GAP_MS) {
      if (!this.bandUp) this.offlineMs += dt;
      if (this.snoring) this.snoreMs += dt;
    }
    if (at - this.winStart >= WINDOW_MS) this.closeWindow(at);
  }

  private closeWindow(at: number) {
    const minutes = (at - this.winStart) / 60_000;
    this.winStart = at;
    if (minutes <= 0) return;

    /* A window with no samples in it is time nobody measured, and it must
     * not be staged. `stageOf` answers "awake" for an empty set — correct
     * for a still wrist that is still reporting, and a fabrication for a
     * band that has dropped off the air. The app would be claiming the
     * sleeper was up all the hour it simply could not see.
     *
     * Held separately so `light` cannot quietly absorb it either. The
     * hypnogram then falls short of the night by exactly the unmeasured
     * minutes, which is the same figure `counts.offlineMin` already
     * reports beside it. */
    if (this.winMotion.length === 0 && this.winVitals.length === 0) {
      this.unstagedMin += minutes;
      return;
    }
    this.stageMin[stageOf(this.winMotion, this.winVitals)] += minutes;
    this.winMotion = [];
    this.winVitals = [];
  }

  /**
   * Advances the ledgers with no new reading. The night must go on being
   * measured while the radio is silent — that silence *is* the offline
   * minutes, and a ledger that only moves when an event arrives can never
   * record the absence of events.
   */
  tick(at: number) {
    this.advance(at);
  }

  /** A comfort event the machine acted on. Kept separate from `feed`
   *  because the decision belongs to the machine, never to the recorder. */
  comfort(
    at: number,
    intervention: NightEvent["intervention"],
    settleSec: number | null,
    offline: boolean,
  ) {
    this.advance(at);
    this.restless++;
    this.events.push({
      id: `c${this.nextId++}`,
      type: "comfort",
      at: this.minute(at),
      title: "Restlessness detected",
      intervention,
      settleSec,
      offline,
    });
  }

  feed(e: BleEvent, at: number) {
    this.advance(at);

    switch (e.kind) {
      case "vitals": {
        // An unworn band reports neither pulse nor stillness, and folding
        // its zeroes in would drag the whole night's average down.
        if (!e.data.worn) break;
        this.bpm.push(e.data.bpm);
        if (e.data.rrMs > 0) this.rr.push(e.data.rrMs);
        this.winVitals.push(e.data);
        break;
      }
      case "motion":
        this.winMotion.push(e.data);
        break;
      case "oxygen": {
        // 0 is "not valid", never "zero percent". §3.2, and `desaturations`
        // drops them again on its own side.
        if (e.data.spo2Pct > 0) this.oxygen.push({ ...e.data, at });
        if (e.data.position !== "unknown") this.position[e.data.position]++;
        break;
      }
      case "room":
        this.rooms.push({ ...e.data, at });
        break;
      case "snore":
        if (e.data.flagged && !this.snoring) {
          this.events.push({
            id: `s${this.nextId++}`,
            type: "snore",
            at: this.minute(at),
            title: "Snoring pattern detected",
          });
        }
        this.snoring = e.data.flagged;
        break;
      case "escalation":
        // Stage 0 is the ladder standing down, not an anomaly of its own.
        if (e.data.stage > 0) {
          this.anomaly++;
          this.events.push({
            id: `a${this.nextId++}`,
            type: "anomaly",
            at: this.minute(at),
            title: "Heart rhythm needed checking",
          });
        }
        break;
      case "link":
        if (e.device === "band") {
          this.bandUp = e.state === "connected";
          // Samples stop arriving, so the open window would otherwise be
          // judged on whatever happened just before the radio went quiet.
          if (!this.bandUp) {
            this.winMotion = [];
            this.winVitals = [];
          }
        }
        break;
      case "buffered":
        // §3.9. The band's own timestamps rode in with these and `replay`
        // restored them, so they are fed like anything else — and they are
        // why `advance` guards against long gaps in both directions.
        for (const b of e.events) this.feed(b, this.atOf(b) ?? at);
        break;
    }
  }

  private atOf(e: BleEvent): number | null {
    return "data" in e && e.data && typeof (e.data as { at?: number }).at === "number"
      ? (e.data as { at: number }).at
      : null;
  }

  private minute(at: number) {
    return Math.max(0, Math.round((at - this.startedAt) / 60_000));
  }

  /**
   * Closes the night. `at` is when monitoring stopped, which is the only
   * honest end: a phone that lost the band at 03:00 recorded a night that
   * ended when the user woke, not when the radio dropped.
   */
  finish(at: number, date: string): Night {
    this.advance(at);
    this.closeWindow(at);

    const durationMin = Math.max(0, Math.round((at - this.startedAt) / 60_000));
    const sorted = [...this.bpm].sort((a, b) => a - b);

    // No usable pulse all night means the band was not worn. The room was
    // still recorded, and `score: null` is the shape the screens already
    // handle for exactly that case.
    const worn = sorted.length >= 10;

    const heart = worn
      ? {
          avg: Math.round(this.bpm.reduce((a, b) => a + b, 0) / this.bpm.length),
          min: sorted[0]!,
          max: sorted[sorted.length - 1]!,
          resting: restingFrom(this.bpm) ?? sorted[0]!,
          hrv: rmssd(this.rr) ?? 0,
        }
      : { avg: 0, min: 0, max: 0, resting: 0, hrv: 0 };

    /* Rounded once, then light absorbs the remainder — the same trick
     * mock.ts uses. Four independently rounded figures do not add up to
     * the duration, and a bar chart whose parts miss its own total is the
     * first thing anyone notices. */
    const deep = Math.round(worn ? this.stageMin.deep : 0);
    const rem = Math.round(worn ? this.stageMin.rem : 0);
    const awake = Math.round(worn ? this.stageMin.awake : 0);
    const unstaged = Math.round(worn ? this.unstagedMin : 0);
    const light = Math.max(0, durationMin - deep - rem - awake - unstaged);

    const { darkOptimalMin, pollutionMin } = darkness(this.rooms);

    // Tonight's own high plateau. §8.1's rolling baseline is for resting
    // pulse across nights; oxygen has no equivalent here, and a baseline
    // taken from a different night's finger placement would be worse than
    // one taken from this night's best readings.
    const spo2High = this.oxygen.length
      ? percentile([...this.oxygen.map((o) => o.spo2Pct)].sort((a, b) => b - a), 0.1)
      : 0;
    const desats = desaturations(this.oxygen, spo2High);
    /* The deepest dip that actually qualified as an event, not a low
     * percentile of every sample. A percentile answers "where does the
     * bottom of the night sit", which a single short desaturation can
     * never reach — and a screen headed "from baseline" showing 0% on a
     * night that had one is worse than showing nothing. */
    const deepest = desats.length ? Math.min(...desats.map((d) => d.lowest)) : null;

    for (const d of desats) {
      this.events.push({
        id: `d${this.nextId++}`,
        type: "desaturation",
        at: this.minute(d.from),
        title: "Oxygen dipped below your baseline",
        position: d.position,
      });
    }

    const snoreMin = Math.round(this.snoreMs / 60_000);

    const contributors: Contributor[] = worn
      ? [
          {
            key: "duration",
            label: "Total sleep",
            value: fmtDur(durationMin - awake),
            delta: durationMin - awake >= 420 ? 6 : -4,
          },
          { key: "deep", label: "Deep sleep", value: fmtDur(deep), delta: deep >= 70 ? 5 : -3 },
          {
            key: "restless",
            label: "Restlessness",
            value: `${this.restless} times`,
            delta: this.restless <= 4 ? 4 : -5,
          },
          {
            key: "dark",
            label: "Optimal Darkness",
            value: fmtDur(darkOptimalMin),
            delta: pollutionMin < 15 ? 3 : -2,
          },
        ]
      : [];

    /* Built from the contributors the screen already shows, so the number
     * and its explanation cannot drift apart. Anomalies are not among them
     * — they belong to the night, not to any one factor. */
    const score = worn
      ? Math.max(
          0,
          Math.min(100, 60 + contributors.reduce((a, c) => a + c.delta, 0) - this.anomaly * 6),
        )
      : null;

    this.events.sort((a, b) => a.at - b.at);

    return {
      date,
      score,
      sleep: {
        startMin: new Date(this.startedAt).getHours() * 60 + new Date(this.startedAt).getMinutes(),
        durationMin,
        deep,
        light,
        rem,
        awake,
      },
      heart,
      room: { tempC: null, rh: null, lux: this.rooms.at(-1)?.lux ?? null, db: null },
      light: { darkOptimalMin, pollutionMin },
      breathing: {
        desatPerHour: desatPerHour(desats, durationMin * 60_000),
        snoreMin,
        spo2DeltaPct: deepest !== null ? deepest - spo2High : 0,
      },
      counts: {
        restless: this.restless,
        anomaly: this.anomaly,
        offlineMin: Math.round(this.offlineMs / 60_000),
      },
      positions: Object.fromEntries(
        POSITIONS.map((p) => {
          const total = POSITIONS.reduce((a, k) => a + this.position[k], 0);
          return [p, total ? Math.round((this.position[p] / total) * durationMin) : 0];
        }),
      ) as Night["positions"],
      contributors,
      events: this.events,
      insight: worn
        ? pollutionMin > 25
          ? "Light was leaking in for part of the night. Covering it is the cheapest change here."
          : this.restless > 4
            ? "You stirred more than usual. The comfort log shows what was tried each time."
            : "You settled quickly and stayed down. Nothing here needs attention."
        : "The band was not worn, so only the room was recorded.",
    };
  }
}

/** Local calendar date of the night's start. A session beginning at
 *  23:40 belongs to that evening, and `toISOString` would file it under
 *  tomorrow for anyone east of Greenwich — Jakarta included. */
export function nightDate(startedAt: number): string {
  const d = new Date(startedAt);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
