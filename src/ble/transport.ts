/**
 * The BLE surface, as one interface. PRD §11.5.
 *
 * Two things sit behind it: the real devices, and a mock that replays a
 * synthetic night. The mock is not a convenience — with firmware still
 * unanswered on `BLE_GATT_CONTRACT.md` §7, it is the only thing the state
 * machine can be built against, and it is the demo's safety net if the
 * hardware misbehaves on the 24th.
 *
 * Shapes here follow `BLE_GATT_CONTRACT.md` exactly, already decoded from
 * the wire. Scaling and endianness belong to the decoder, not to callers:
 * §1 forbids floats on air, so `rrMs` arrives as an integer and
 * `spo2Pct` as a whole percent, and nobody above this line needs to know.
 */

/** §3.1 `0001`. One reading of the wrist. */
export type Vitals = {
  at: number;
  bpm: number;
  rrMs: number;
  /** §3.1 status bit 7. False means the band is on a table, and a table
   *  has no pulse — the single most important flag in this file. */
  worn: boolean;
  /** §3.1 status bits 3-0, 0-15. Calibration gates on this. */
  signalQuality: number;
};

/** §3.2 `0002`. */
export type Oxygen = {
  at: number;
  /** 0 means "not valid", not "zero percent". */
  spo2Pct: number;
  position: "supine" | "left" | "right" | "prone" | "unknown";
};

/** §3.3 `0003`. */
export type Motion = { at: number; levelMg: number };

/**
 * §3.5 `0007`. The ladder's own account of itself.
 *
 * This arrives, it is never computed here. PRD §4.1: the ladder runs in
 * the band's firmware whether a phone is present or not, and the app is a
 * mirror. A stage that this app decided would be a stage the band does not
 * know about, which is how two authorities start disagreeing at 3am.
 */
export type Escalation = {
  at: number;
  /** 0 normal/cancelled · 1 silent · 2 soft buzz · 3 hard buzz + wake the
   *  screen · 4 unresponsive → SOS_SENT */
  stage: 0 | 1 | 2 | 3 | 4;
  reason: "none" | "irregular" | "threshold" | "manual";
};

/** §3.4 `0004`. Indicate, must land in under 2 seconds. */
export type SosPress = { at: number };

/** §3.6 `0008`. */
export type BandStatus = {
  at: number;
  percent: number;
  charging: boolean;
  /** 0 = the band has never had its clock set. §3.6 explains why this
   *  ruins settle times, and settle times are the learning loop's proof. */
  epochS: number;
};

/** §4.1 `0001` on the bedside service. */
export type Room = {
  at: number;
  tempC: number;
  humidityPct: number;
  lux: number;
  db: number;
};

/** §4.2 `0002`. */
export type Snore = { at: number; flagged: boolean };

export type Link = "idle" | "scanning" | "connected" | "lost";

/** Which physical thing a link belongs to. */
export type Device = "band" | "bedside";

/**
 * Everything the transport can push upwards. One union rather than a
 * listener per characteristic: the state machine wants an ordered stream,
 * and interleaving separate callbacks is how ordering quietly breaks.
 */
export type BleEvent =
  | { kind: "vitals"; data: Vitals }
  | { kind: "oxygen"; data: Oxygen }
  | { kind: "motion"; data: Motion }
  | { kind: "escalation"; data: Escalation }
  | { kind: "sos"; data: SosPress }
  | { kind: "band-status"; data: BandStatus }
  | { kind: "room"; data: Room }
  | { kind: "snore"; data: Snore }
  | { kind: "link"; device: Device; state: Link }
  /** §4.4. `refused` is the safety limit saying no — and it has to say so
   *  out loud, because firmware that quietly runs 30s instead of the 60
   *  asked for looks identical from up here. */
  | { kind: "ack"; commandId: number; status: "done" | "failed" | "refused" }
  /** §3.9 `0006`. Events the band recorded while nobody was listening.
   *  Flagged so the timeline can mark them — PRD §11 forbids an offline
   *  event from looking identical to a live one. */
  | { kind: "buffered"; events: BleEvent[] }
  /** §3.10 `000A`, and only while a recording the user asked for is
   *  running. `leadOn` travels with the samples rather than beside them:
   *  a trace drawn without it is a picture of noise presented as a heart,
   *  which is the most dangerous thing this app could show. */
  | { kind: "ecg"; seq: number; leadOn: boolean; samples: Int16Array };

/** §4.3 `0003` on the bedside. The only commands that exist. */
export type Actuator =
  | { kind: "noise"; level: 0 | 1 | 2 | 3 }
  | { kind: "light"; mode: "off" | "sunset" | "amber-dim" | "white-flash" }
  /** §5.3 caps this at 20-30s per event. The app enforces it and so does
   *  the bedside firmware — independently, because one of them will be
   *  wrong eventually. */
  | { kind: "aroma"; seconds: number }
  | { kind: "siren"; on: boolean };

/** §3.8 `0009`. */
export type BandCommand =
  | { cmd: "vibrate"; pattern: "soft" | "hard"; durationMs: number }
  | { cmd: "sync_time"; epochS: number }
  | { cmd: "record_baseline"; durationS: number }
  | { cmd: "ecg_start"; durationS: number }
  | { cmd: "ecg_stop" };

/** §3.7 `0005`. Absent fields mean unchanged. */
export type BandConfig = Partial<{
  baseline_bpm: number;
  hr_threshold_delta: number;
  rr_variability_threshold: number;
  stage1_s: number;
  stage2_s: number;
  stage3_s: number;
  motion_response_threshold_mg: number;
  spo2_sample_interval_s: number;
}>;

export interface BleTransport {
  /** Begins scanning and connecting. Resolves once the transport is
   *  running, not once a device is found — finding one is an event. */
  start(): Promise<void>;
  stop(): Promise<void>;

  /** Returns an unsubscribe. */
  on(listener: (e: BleEvent) => void): () => void;

  send(a: Actuator): Promise<void>;
  command(c: BandCommand): Promise<void>;
  configure(c: BandConfig): Promise<void>;

  /** What the transport believes right now, for a screen that has just
   *  mounted and missed every event so far. */
  links(): Record<Device, Link>;
}
