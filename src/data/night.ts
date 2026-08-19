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
 * Kept free of React and Firestore so it can be checked in node. A
 * night takes eight hours to happen and the aggregation has exactly one
 * chance to be right.
 *
 * ── What this hardware cannot measure ──
 *
 * Sleep staging. Deep, light, and REM come from brain activity, and a
 * MAX30102 on a wrist has no access to it. Wearables that print those
 * numbers are inferring them from heart rate and movement, and the
 * inference is weak enough that this build refuses to make it: they are
 * recorded as null and drawn as absent. Time asleep and time awake are
 * different — a still body and a moving one really are distinguishable
 * from the accelerometer, so those are measured.
 */
import type { BleEvent } from "@/ble/transport";
import type { Contributor, Night, NightEvent } from "./mock";

/** Above this, and the body is not asleep. Same figure the comfort
 *  machine uses for restlessness, because it is the same question. */
const AWAKE_MG = 400;

/** §4.1's own threshold for optimal darkness. */
const DARK_LUX = 3;

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
  private spo2: number[] = [];
  private position: Record<Position, number> = { supine: 0, left: 0, right: 0, prone: 0 };

  /** Millisecond ledgers. Integrated against real elapsed time rather
   *  than counted as samples, because notification rates drift and a
   *  dropped connection must not shorten the night it interrupted. */
  private awakeMs = 0;
  private darkMs = 0;
  private pollutionMs = 0;
  private snoreMs = 0;
  private offlineMs = 0;

  private restless = 0;
  private anomaly = 0;
  private desaturations = 0;

  private moving = false;
  private lux: number | null = null;
  private snoring = false;
  private bandUp = true;

  private events: NightEvent[] = [];
  private nextId = 0;

  constructor(startedAt: number) {
    this.startedAt = startedAt;
    this.lastAt = startedAt;
  }

  /** Charges elapsed time to whichever ledgers are currently open. Every
   *  event calls this first, so the ledgers always describe the interval
   *  that just ended rather than the one about to start. */
  private advance(at: number) {
    const dt = at - this.lastAt;
    this.lastAt = at;
    if (dt <= 0 || dt > MAX_SAMPLE_GAP_MS) return;

    if (this.moving) this.awakeMs += dt;
    if (!this.bandUp) this.offlineMs += dt;
    if (this.snoring) this.snoreMs += dt;
    if (this.lux !== null) {
      if (this.lux < DARK_LUX) this.darkMs += dt;
      else this.pollutionMs += dt;
    }
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
  comfort(at: number, intervention: NightEvent["intervention"], settleSec: number | null, offline: boolean) {
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
        break;
      }
      case "motion":
        this.moving = e.data.levelMg > AWAKE_MG;
        break;
      case "oxygen": {
        if (e.data.spo2Pct > 0) this.spo2.push(e.data.spo2Pct);
        if (e.data.position !== "unknown") this.position[e.data.position]++;
        break;
      }
      case "room":
        this.lux = e.data.lux;
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
          // A band that stopped reporting mid-thrash would otherwise leave
          // `moving` latched, and every silent minute would be billed as
          // time awake.
          if (!this.bandUp) this.moving = false;
        }
        break;
      case "buffered":
        // §3.9. The band's own timestamps already rode in with these, and
        // `replay` restored them, so they are fed like anything else — but
        // they are the reason `advance` guards against long gaps.
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

    const durationMin = Math.max(0, Math.round((at - this.startedAt) / 60_000));
    const awake = Math.min(durationMin, Math.round(this.awakeMs / 60_000));
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
          resting: percentile(sorted, 0.05),
          hrv: rmssd(this.rr) ?? 0,
        }
      : { avg: 0, min: 0, max: 0, resting: 0, hrv: 0 };

    const darkOptimalMin = Math.round(this.darkMs / 60_000);
    const pollutionMin = Math.round(this.pollutionMs / 60_000);
    const snoreMin = Math.round(this.snoreMs / 60_000);
    const hours = durationMin / 60;

    const spo2Baseline = this.spo2.length ? percentile([...this.spo2].sort((a, b) => b - a), 0.1) : 0;
    const spo2Low = this.spo2.length ? percentile([...this.spo2].sort((a, b) => a - b), 0.05) : 0;

    const contributors: Contributor[] = worn
      ? [
          {
            key: "duration",
            label: "Total sleep",
            value: fmtDur(durationMin - awake),
            delta: durationMin - awake >= 420 ? 6 : -4,
          },
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
          {
            key: "awake",
            label: "Awake",
            value: fmtDur(awake),
            delta: awake <= 30 ? 3 : -4,
          },
        ]
      : [];

    /* Built only from what was measured. The synthetic set scores partly
     * on deep sleep; this one cannot, and inventing a stage figure to keep
     * the formula symmetrical would put a fabricated number underneath
     * every score the app ever shows. */
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
        deep: null,
        light: null,
        rem: null,
        awake,
      },
      heart,
      room: { tempC: null, rh: null, lux: this.lux, db: null },
      light: { darkOptimalMin, pollutionMin },
      breathing: {
        desatPerHour: hours > 0 ? Math.round((this.desaturations / hours) * 10) / 10 : 0,
        snoreMin,
        spo2DeltaPct: this.spo2.length ? spo2Low - spo2Baseline : 0,
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
