import type {
  Actuator,
  BandCommand,
  BandConfig,
  BleEvent,
  BleTransport,
  Device,
  Link,
} from "./transport";

/**
 * The mock transport. PRD §11.5.
 *
 * Five scenarios, because those are the five §11.5 names: a normal night,
 * a restless spell, an anomaly the body answers, an anomaly it does not,
 * and a dropout followed by a buffer flush.
 *
 * ponytail: the PRD describes replaying a night from a JSON file. A
 * generator in code covers the same five scenarios with no file to keep in
 * step with the contract, and the seeder (§11.6) already owns the
 * fourteen-night history. Move to a file if scenarios ever need editing
 * without a rebuild.
 *
 * Time is virtual. One `step()` is one second of night, and `speed` only
 * decides how fast those seconds arrive in the real world — a demo cannot
 * wait twenty minutes for a sunset and a test cannot wait at all.
 */

export type Scenario =
  | "normal"
  | "restless"
  | "anomaly-recovers"
  | "anomaly-sos"
  | "dropout-flush";

const RESTING_BPM = 62;

/** §3.5's own timings: stage 1 lasts 20s, stage 2 fifteen, stage 3 thirty,
 *  and stage 4 lands at 65s. Written as offsets from the anomaly so the
 *  numbers can be read against the contract without arithmetic. */
const LADDER = [
  { at: 0, stage: 1 as const },
  { at: 20, stage: 2 as const },
  { at: 35, stage: 3 as const },
  { at: 65, stage: 4 as const },
];

/** When the scripted events happen, in seconds of night. Small numbers on
 *  purpose — nobody demonstrates anything at 3am scale. */
const ANOMALY_AT = 60;
const RESTLESS_AT = 45;
const DROPOUT_AT = 30;
const DROPOUT_FOR = 40;

type Listener = (e: BleEvent) => void;

export class MockTransport implements BleTransport {
  private listeners = new Set<Listener>();
  private link: Record<Device, Link> = { band: "idle", bedside: "idle" };
  private timer: number | undefined;

  /** Seconds of night elapsed. */
  private vt = 0;
  /** Set when the ladder starts, so stage offsets stay readable. */
  private ladderFrom: number | null = null;
  private stage = 0;
  /** Events the band recorded while the link was down, replayed on
   *  reconnect as one batch — §3.9. They are not re-emitted as live
   *  events, because PRD §11 forbids the timeline from showing an offline
   *  event that looks identical to a monitored one. */
  private buffer: BleEvent[] = [];
  private offline = false;

  private readonly scenario: Scenario;
  private readonly speed: number;

  // Written out rather than declared as constructor parameter properties:
  // the check files run through `node --experimental-strip-types`, which
  // refuses them.
  constructor(scenario: Scenario = "normal", speed = 20) {
    this.scenario = scenario;
    this.speed = speed;
  }

  async start() {
    if (this.timer !== undefined) return;
    this.setLink("band", "scanning");
    this.setLink("bedside", "scanning");
    // A real scan is not instant, and a UI that has never seen a pending
    // state will not have one when the hardware arrives.
    this.emitIn(2, () => {
      this.setLink("band", "connected");
      this.setLink("bedside", "connected");
    });
    this.timer = window.setInterval(() => this.step(), 1000 / this.speed);
  }

  /** Nothing to hang up on, so it only reports the link the caller asked
   *  to drop. A demo running on the mock still has to see the button do
   *  what it says. */
  async release(device: Device) {
    this.setLink(device, "idle");
  }

  /** Nothing to look for, so it simply attaches again — the demo has to
   *  see the button do what it says too. */
  async retry(_device?: Device) {
    this.setLink("band", "connected");
    this.setLink("bedside", "connected");
  }

  async stop() {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
    this.setLink("band", "idle");
    this.setLink("bedside", "idle");
  }

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async send(_a: Actuator, _opts?: { unclamped?: boolean }) {
    // The bedside confirms completion in §4.4; nothing here needs it yet.
  }

  async command(c: BandCommand) {
    // The Test panel drives the ladder through this in a demo, so a
    // scripted scenario is not the only way to reach stage 3.
    if (c.cmd === "vibrate" && c.pattern === "hard") this.beginLadder();
  }

  async configure(_c: BandConfig) {}

  links() {
    return { ...this.link };
  }

  /** One second of night. Public so the check file can drive it without
   *  timers, which is the only reason a ladder test can be instant. */
  step() {
    this.vt += 1;
    this.runScript();
    if (this.offline) {
      // The band keeps recording while the phone is deaf — that is the
      // whole point of §3.9, and a mock that goes quiet here would prove
      // the flush path works when it has nothing to flush.
      this.buffer.push(this.vitals());
      return;
    }
    this.emit(this.vitals());
    this.emit(this.motion());
    if (this.vt % 20 === 0) this.emit(this.oxygen());
    if (this.vt % 300 === 0) {
      this.emit(this.room());
      this.emit(this.bandStatus());
    }
    this.advanceLadder();
  }

  // ---- scripted moments -------------------------------------------------

  private runScript() {
    const s = this.scenario;
    if ((s === "anomaly-recovers" || s === "anomaly-sos") && this.vt === ANOMALY_AT) {
      this.beginLadder();
    }
    // A body that answers cancels the ladder before stage 3 — §3.5 says
    // that transition must be sent, not silently dropped, because the app
    // records it as an ordinary warning and calls nobody.
    if (s === "anomaly-recovers" && this.ladderFrom !== null && this.since() === 25) {
      this.ladderFrom = null;
      this.stage = 0;
      this.emit({ kind: "escalation", data: { at: Date.now(), stage: 0, reason: "none" } });
    }
    if (s === "restless" && this.vt === RESTLESS_AT) {
      this.emit(this.motion(900));
    }
    if (s === "dropout-flush") {
      if (this.vt === DROPOUT_AT) {
        this.offline = true;
        this.setLink("band", "lost");
      }
      if (this.vt === DROPOUT_AT + DROPOUT_FOR) {
        this.offline = false;
        this.setLink("band", "connected");
        this.emit({ kind: "buffered", events: this.buffer });
        this.buffer = [];
      }
    }
  }

  private beginLadder() {
    if (this.ladderFrom !== null) return;
    this.ladderFrom = this.vt;
    this.stage = 0;
  }

  private since() {
    return this.ladderFrom === null ? -1 : this.vt - this.ladderFrom;
  }

  private advanceLadder() {
    if (this.ladderFrom === null) return;
    const t = this.since();
    const due = [...LADDER].reverse().find((s) => t >= s.at);
    if (!due || due.stage === this.stage) return;
    this.stage = due.stage;
    this.emit({
      kind: "escalation",
      data: { at: Date.now(), stage: due.stage, reason: "irregular" },
    });
    if (due.stage === 4) this.ladderFrom = null;
  }

  // ---- sample shapes ----------------------------------------------------

  /** Deterministic wobble. Random numbers make a test that passes today
   *  and fails on a Tuesday. */
  private wobble(range: number) {
    return (Math.sin(this.vt * 1.7) * range) | 0;
  }

  private vitals(): BleEvent {
    const climbing = this.since() >= 0 ? 28 : 0;
    const bpm = RESTING_BPM + climbing + this.wobble(3);
    return {
      kind: "vitals",
      data: {
        at: Date.now(),
        bpm,
        rrMs: Math.round(60000 / bpm),
        worn: true,
        held: false,
        signalQuality: 12,
      },
    };
  }

  private motion(levelMg?: number): BleEvent {
    const base = this.scenario === "restless" ? 140 : 30;
    return {
      kind: "motion",
      data: { at: Date.now(), levelMg: levelMg ?? base + this.wobble(20) },
    };
  }

  private oxygen(): BleEvent {
    return {
      kind: "oxygen",
      data: { at: Date.now(), spo2Pct: 96 + (this.wobble(2) % 2), position: "supine" },
    };
  }

  private room(): BleEvent {
    return {
      kind: "room",
      data: { at: Date.now(), tempC: 27.6, humidityPct: 73, lux: 1.8, db: 40 },
    };
  }

  private bandStatus(): BleEvent {
    return {
      kind: "band-status",
      data: { at: Date.now(), percent: 87, charging: false, epochS: Math.floor(Date.now() / 1000) },
    };
  }

  // ---- plumbing ---------------------------------------------------------

  private setLink(device: Device, state: Link) {
    this.link[device] = state;
    this.emit({ kind: "link", device, state });
  }

  private emit(e: BleEvent) {
    for (const l of this.listeners) l(e);
  }

  private emitIn(seconds: number, fn: () => void) {
    window.setTimeout(fn, (seconds * 1000) / this.speed);
  }
}
