import type {
  Actuator,
  BleEvent,
  BandCommand,
  BandConfig,
  BandStatus,
  Escalation,
  Motion,
  Oxygen,
  Room,
  Snore,
  Vitals,
} from "./transport";

/**
 * Every byte that crosses the air, in one file. `BLE_GATT_CONTRACT.md` §3
 * and §4.
 *
 * This is the part of the integration that will be wrong on the day the
 * firmware arrives — interfaces agree easily, byte layouts do not. So it
 * lives in TypeScript where it can be checked against the contract without
 * a device, rather than inside the native plugin where the only way to
 * test it is to plug something in and squint.
 *
 * §1 is absolute: little-endian everywhere, no floats on air. Every
 * fractional value arrives as a scaled integer and is divided here, once,
 * so nothing above this file ever has to remember the scale.
 */

const dv = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);

/** §3.2 position enum. 255 is "unknown", which is not the same as supine. */
const POSITION: Record<number, Oxygen["position"]> = {
  0: "supine",
  1: "left",
  2: "right",
  3: "prone",
  255: "unknown",
};

/** §3.5 reason enum. */
const REASON: Record<number, Escalation["reason"]> = {
  0: "none",
  1: "irregular",
  2: "threshold",
  3: "manual",
};

/**
 * §3.1 `0001`. One status byte, then up to five 3-byte samples, oldest
 * first.
 *
 * `at` comes from the phone, not the band. §5.5: while connected the phone
 * is the clock, and the band's own time only matters for the offline
 * buffer. That single rule removes most of the synchronisation problem.
 */
export function decodeVitals(b: Uint8Array, at: number): Vitals[] {
  const status = b[0]!;
  const worn = (status & 0b1000_0000) !== 0;
  const signalQuality = status & 0b0000_1111;

  const out: Vitals[] = [];
  const v = dv(b);
  for (let o = 1; o + 2 < b.length; o += 3) {
    out.push({ at, bpm: b[o]!, rrMs: v.getUint16(o + 1, true), worn, signalQuality });
  }
  return out;
}

/** §3.2 `0002`. */
export function decodeOxygen(b: Uint8Array, at: number): Oxygen {
  return { at, spo2Pct: b[0]!, position: POSITION[b[1]!] ?? "unknown" };
}

/** §3.3 `0003`. Thousandths of g — 0.42 g arrives as 420. */
export function decodeMotion(b: Uint8Array, at: number): Motion {
  return { at, levelMg: dv(b).getUint16(0, true) };
}

/** §3.5 `0007`. Indicate, because a lost Notify is a lost safety event. */
export function decodeEscalation(b: Uint8Array, at: number): Escalation {
  return {
    at,
    stage: Math.min(4, b[0]!) as Escalation["stage"],
    reason: REASON[b[1]!] ?? "none",
  };
}

/** §3.4 `0004`. One byte, and only `1` means anything. */
export function decodeSosPress(b: Uint8Array): boolean {
  return b[0] === 1;
}

/**
 * §3.6 `0008`. Two absences, spelled differently and both load-bearing:
 * `epochS` of 0 means the band has never had its clock set, and `percent`
 * of 255 means there is nothing measuring the battery. Neither is a
 * reading, and a screen that renders them as one is lying in the two
 * places §3.6 exists to stop it.
 */
export function decodeBandStatus(b: Uint8Array, at: number): BandStatus {
  return {
    at,
    percent: b[0] === 255 ? null : b[0]!,
    charging: b[1] === 1,
    epochS: dv(b).getUint32(2, true),
  };
}

/** §4.1 bedside `0001`. Every fraction is a scaled integer here. */
/**
 * Shortest packet each characteristic can carry and still be read, from
 * the offset tables in §3 and §4.
 *
 * Bytes off a radio are not bytes from a test. A notification can arrive
 * truncated — firmware mid-development, an MTU renegotiated under a weak
 * link — and the decoders below index straight into a DataView, so three
 * of them threw RangeError out of the notification callback. One throw
 * there takes the stream down for the rest of the night, silently.
 *
 * The quieter one is worse. `decodeEscalation` read a single byte as a
 * stage 3 with no reason attached, so a torn packet could raise an alarm
 * that no heart asked for. A packet too short to read is not a packet to
 * guess at.
 */
export const MIN_BYTES = {
  vitals: 1,
  oxygen: 2,
  motion: 2,
  sos: 1,
  escalation: 2,
  status: 6,
  buffer: 3,
  ecg: 2,
  room: 9,
  snore: 2,
  ack: 2,
} as const;

export type Packet = keyof typeof MIN_BYTES;

/** Whether the buffer is long enough to decode without inventing bytes. */
export function readable(kind: Packet, b: Uint8Array): boolean {
  return b.length >= MIN_BYTES[kind];
}

export function decodeRoom(b: Uint8Array, at: number): Room {
  const v = dv(b);
  // A bedroom cannot sit at 0% relative humidity. §4.1 carries no marker for
  // "not measured", so a DHT that never answered leaves the bedside's own
  // initialisers on the air — 0.0 °C and 0% RH, shaped exactly like a
  // reading. Both fields come from the one sensor, so the impossible value
  // condemns the pair rather than just itself.
  const rh = v.getUint16(2, true);
  const dht = rh !== 0;
  return {
    at,
    tempC: dht ? v.getInt16(0, true) / 10 : null,
    humidityPct: dht ? rh / 10 : null,
    // ×100, not ×10: optimal darkness is below 3 lux and real readings run
    // to 0.4, so a plain integer would round the whole darkness check into
    // meaninglessness.
    lux: v.getUint32(4, true) / 100,
    db: b[8]!,
  };
}

/** §4.2 bedside `0002`. */
export function decodeSnore(b: Uint8Array, at: number): Snore & { intensity: number } {
  return { at, flagged: b[0] === 1, intensity: b[1]! };
}

/** §4.4 bedside `0004`. Without `commandId` a confirmation cannot be
 *  matched to its command, and two commands two seconds apart become one
 *  ambiguous reply. */
export function decodeAck(b: Uint8Array): {
  commandId: number;
  status: "done" | "failed" | "refused";
} {
  const status = ({ 0: "done", 1: "failed", 2: "refused" } as const)[b[1]! as 0 | 1 | 2];
  return { commandId: b[0]!, status: status ?? "failed" };
}

/** §3.10 `000A`. */
export function decodeEcg(b: Uint8Array): {
  seq: number;
  leadOn: boolean;
  samples: Int16Array;
} {
  const v = dv(b);
  const samples = new Int16Array((b.length - 2) >> 1);
  for (let i = 0; i < samples.length; i++) samples[i] = v.getInt16(2 + i * 2, true);
  // A garbage trace drawn as a real one is the most dangerous thing this
  // app could show, so `leadOn` travels with the samples and the recorder
  // refuses to save without it.
  return { seq: b[0]!, leadOn: (b[1]! & 0b1000_0000) !== 0, samples };
}

// --- offline buffer, §3.9 -------------------------------------------------

export const FLUSH_SENTINEL = 0xffff;

export type BufferEntry =
  | { epochS: number; type: "anomaly"; reason: Escalation["reason"] }
  | { epochS: number; type: "stage"; stage: number; reason: Escalation["reason"] }
  | { epochS: number; type: "sos" }
  | { epochS: number; type: "vitals"; bpm: number; spo2Pct: number; levelMg: number }
  | { epochS: number; type: "link"; connected: boolean };

/**
 * One flush packet. `seq` of `0xFFFF` is the sentinel that closes the
 * burst; the caller acknowledges with the last real sequence, and only
 * then does the band erase anything.
 */
export function decodeBufferPacket(b: Uint8Array): {
  seq: number;
  sentinel: boolean;
  entries: BufferEntry[];
} {
  const v = dv(b);
  const seq = v.getUint16(0, true);
  if (seq === FLUSH_SENTINEL) return { seq, sentinel: true, entries: [] };

  const count = b[2]!;
  const entries: BufferEntry[] = [];
  for (let i = 0; i < count; i++) {
    const o = 3 + i * 9;
    if (o + 9 > b.length) break;
    // The event's real time, not the time it reached us. Reconstructing a
    // timeline with receipt times would put a whole night's events in the
    // same second.
    const epochS = v.getUint32(o, true);
    const p = [b[o + 5]!, b[o + 6]!, b[o + 7]!, b[o + 8]!];
    switch (b[o + 4]) {
      case 1:
        entries.push({ epochS, type: "anomaly", reason: REASON[p[0]!] ?? "none" });
        break;
      case 2:
        entries.push({ epochS, type: "stage", stage: p[0]!, reason: REASON[p[1]!] ?? "none" });
        break;
      case 3:
        entries.push({ epochS, type: "sos" });
        break;
      case 4:
        // Note the byte order: the contract spells this payload out as
        // `[bpm, spo2, milli_g >> 8, milli_g & 0xFF]`, which is big-endian
        // inside an otherwise little-endian protocol. Written explicitly,
        // so it is followed explicitly.
        entries.push({
          epochS,
          type: "vitals",
          bpm: p[0]!,
          spo2Pct: p[1]!,
          levelMg: (p[2]! << 8) | p[3]!,
        });
        break;
      case 5:
        entries.push({ epochS, type: "link", connected: p[0] === 1 });
        break;
    }
  }
  return { seq, sentinel: false, entries };
}

/** §2.1. Manufacturer data on the band's advertisement, so the bedside can
 *  siren on its own and a phone that lost the link can still read the real
 *  stage without reconnecting. */
export function decodeAdvertisement(b: Uint8Array): {
  protocolVersion: number;
  stage: number;
  worn: boolean;
  phoneConnected: boolean;
} | null {
  if (b.length < 5) return null;
  if (dv(b).getUint16(0, true) !== 0xffff) return null;
  return {
    protocolVersion: b[2]!,
    stage: b[3]!,
    worn: (b[4]! & 0b1000_0000) !== 0,
    phoneConnected: (b[4]! & 0b0000_0001) !== 0,
  };
}

// --- outbound -------------------------------------------------------------

const utf8 = (o: unknown) => new TextEncoder().encode(JSON.stringify(o));

/** §4.3 bedside `0003`. `commandId` is echoed back in the confirmation. */
/**
 * `unclamped` exists for exactly one caller: §6 test 4, which has to hear
 * the bedside refuse an over-long aroma request out loud.
 *
 * The clamp below is a real safety limit and stays on for everything else.
 * But a request this app already shortened to 30s is a request the firmware
 * will happily accept, so a test that sends one proves the opposite of what
 * it claims — and a firmware that quietly runs 30s instead of refusing 60
 * would pass it.
 */
export function encodeActuator(
  a: Actuator,
  commandId: number,
  opts?: { unclamped?: boolean },
): Uint8Array {
  switch (a.kind) {
    case "noise":
      return utf8({
        command_id: commandId,
        white_noise: { on: a.level > 0, volume: a.level, track: 2, fade_s: 30 },
      });
    case "light": {
      const light =
        a.mode === "off"
          ? { mode: "off" }
          : a.mode === "sunset"
            ? { mode: "sunset", brightness: 40, kelvin: 2200, ramp_s: 1500 }
            : a.mode === "amber-dim"
              ? { mode: "amber", brightness: 10, kelvin: 2200, ramp_s: 0 }
              : { mode: "alert", brightness: 100, kelvin: 6500, ramp_s: 0 };
      return utf8({ command_id: commandId, light });
    }
    case "aroma":
      // §4.3 caps this at 30s and the firmware refuses anything longer with
      // status 2. Clamped here as well — two independent limits, because
      // one of them will be wrong eventually and it must not be both.
      return utf8({
        command_id: commandId,
        aroma: {
          on: a.seconds > 0,
          duration_s: opts?.unclamped ? a.seconds : Math.min(30, Math.max(0, a.seconds)),
        },
      });
    case "siren":
      return utf8({ command_id: commandId, siren: { on: a.on } });
  }
}

/**
 * §3.8 band `0009`.
 *
 * The JSON goes out verbatim, so a key that is camelCase here is a command
 * the firmware does not recognise — and a firmware that ignores an unknown
 * field says nothing about it. Conformance test 1 would have failed on the
 * day the band arrived and looked like a broken motor.
 *
 * `BandConfig` avoided this by spelling the contract's keys directly; this
 * union did not, because its fields are read by TypeScript elsewhere.
 */
const WIRE: Record<string, string> = {
  durationMs: "duration_ms",
  epochS: "epoch_s",
  durationS: "duration_s",
};

export function encodeBandCommand(c: BandCommand): Uint8Array {
  return utf8(Object.fromEntries(Object.entries(c).map(([k, v]) => [WIRE[k] ?? k, v])));
}

/** §3.7 band `0005`. Absent fields mean unchanged, so an empty object is a
 *  legal no-op rather than a reset. */
export function encodeBandConfig(c: BandConfig): Uint8Array {
  return utf8(c);
}

export const flushStart = () => utf8({ cmd: "flush_start" });
export const flushAck = (lastSeq: number) => utf8({ cmd: "flush_ack", last_seq: lastSeq });

/**
 * §3.9 buffer entries are not `BleEvent`s. This is the translation, and
 * the timestamps stay the band's own: PRD §11 forbids an offline event
 * from arriving as though it had just happened.
 */
export function replay(entries: BufferEntry[]): BleEvent[] {
  const out: BleEvent[] = [];
  for (const e of entries) {
    const at = e.epochS * 1000;
    switch (e.type) {
      case "anomaly":
        out.push({ kind: "escalation", data: { at, stage: 1, reason: e.reason } });
        break;
      case "stage":
        out.push({
          kind: "escalation",
          data: { at, stage: Math.min(4, e.stage) as 0 | 1 | 2 | 3 | 4, reason: e.reason },
        });
        break;
      case "sos":
        out.push({ kind: "sos", data: { at } });
        break;
      case "vitals":
        // The buffer format carries no rr interval, and inventing one puts
        // a made-up number into a chart that reads as measured. Zero is
        // the absence, and every reader of rrMs already treats it so.
        out.push({
          kind: "vitals",
          data: { at, bpm: e.bpm, rrMs: 0, worn: true, signalQuality: 0 },
        });
        out.push({ kind: "motion", data: { at, levelMg: e.levelMg } });
        if (e.spo2Pct > 0)
          out.push({ kind: "oxygen", data: { at, spo2Pct: e.spo2Pct, position: "unknown" } });
        break;
      case "link":
        out.push({ kind: "link", device: "band", state: e.connected ? "connected" : "lost" });
        break;
    }
  }
  return out;
}

