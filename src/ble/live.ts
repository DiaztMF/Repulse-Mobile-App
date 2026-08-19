import { BleClient, type ScanResult } from "@capacitor-community/bluetooth-le";
import {
  decodeAck,
  decodeAdvertisement,
  decodeBandStatus,
  decodeBufferPacket,
  decodeEcg,
  decodeEscalation,
  decodeMotion,
  decodeOxygen,
  decodeRoom,
  decodeSnore,
  decodeSosPress,
  decodeVitals,
  encodeActuator,
  encodeBandCommand,
  encodeBandConfig,
  flushAck,
  flushStart,
  replay,
  type BufferEntry,
} from "./codec";
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
 * The real radio. `BLE_GATT_CONTRACT.md` §2, §3 and §4.
 *
 * Everything about *what the bytes mean* lives in `codec.ts`, where it is
 * checked against the contract's own worked examples without a device in
 * the room. This file owns only what a radio does: finding the thing,
 * staying attached to it, and putting bytes in the right order. That split
 * is deliberate — it keeps the untestable half as small as it can be.
 *
 * It detects nothing. §3.5 and PRD §4.1 put the escalation ladder inside
 * the band's firmware precisely so a dead phone at 2am cannot switch off
 * the feature that saves a life. Stages arrive here already decided.
 */

const SUFFIX = "-8c3a-4b8f-a292-3e83d02f1a00";
const band = (n: string) => `4fa1${n}${SUFFIX}`;
const bedside = (n: string) => `4fa2${n}${SUFFIX}`;

const BAND_SERVICE = band("0000");
const BEDSIDE_SERVICE = bedside("0000");

/** §3. The four digits after `4FA1`. */
const B = {
  vitals: band("0001"),
  oxygen: band("0002"),
  motion: band("0003"),
  sos: band("0004"),
  config: band("0005"),
  buffer: band("0006"),
  escalation: band("0007"),
  status: band("0008"),
  command: band("0009"),
  ecg: band("000a"),
} as const;

/** §4. */
const D = {
  room: bedside("0001"),
  snore: bedside("0002"),
  actuator: bedside("0003"),
  ack: bedside("0004"),
} as const;

/** §2.1. Manufacturer Specific Data rides under company id 0xFFFF. */
const COMPANY = "65535";

const bytes = (v: DataView) => new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
const view = (u: Uint8Array) => new DataView(u.buffer, u.byteOffset, u.byteLength);

export class LiveTransport implements BleTransport {
  private listeners = new Set<(e: BleEvent) => void>();
  private state: Record<Device, Link> = { band: "idle", bedside: "idle" };
  private id: Partial<Record<Device, string>> = {};
  private running = false;

  /** §4.4. Echoed back in the confirmation, and the only way to tell two
   *  commands two seconds apart apart. */
  private nextCommandId = 1;

  /** §3.9. Entries arriving between `flush_start` and the sentinel. */
  private flushing: BufferEntry[] | null = null;

  private scanning = false;
  private scanStartedAt = 0;
  private rescanTimer: ReturnType<typeof setTimeout> | null = null;

  on(listener: (e: BleEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  links() {
    return { ...this.state };
  }

  private emit(e: BleEvent) {
    for (const l of this.listeners) l(e);
  }

  private link(device: Device, state: Link) {
    this.state[device] = state;
    this.emit({ kind: "link", device, state });
  }

  async start() {
    if (this.running) return;
    this.running = true;
    await BleClient.initialize({ androidNeverForLocation: true });

    this.link("band", "scanning");
    this.link("bedside", "scanning");
    await this.scan();
  }

  /**
   * One scan for both devices, filtered on the service UUID and never the
   * name. §2 is blunt about it: a device whose advertisement omits the
   * UUID is one this app will never find, and that is the contract the
   * firmware is held to.
   */
  private async scan() {
    if (this.scanning || !this.running) return;
    this.scanning = true;
    this.scanStartedAt = Date.now();
    await BleClient.requestLEScan(
      { services: [BAND_SERVICE, BEDSIDE_SERVICE], allowDuplicates: true },
      (r) => void this.saw(r),
    );
  }

  /**
   * Scanning all night is a scan nobody needs: once both devices are
   * attached there is nothing left to discover, and a continuous LE scan
   * is one of the more expensive things an app can leave running beside
   * somebody's bed.
   *
   * §2.1 is why this is safe. The band's stage also rides on its
   * advertisement, and that path exists precisely for a phone that has
   * lost the connection — which restarts the scan below.
   */
  private async idle() {
    if (!this.scanning) return;
    if (this.state.band !== "connected" || this.state.bedside !== "connected") return;
    this.scanning = false;
    try {
      await BleClient.stopLEScan();
    } catch {
      // Already stopped.
    }
  }

  /**
   * Android blocks an app that starts more than five scans in thirty
   * seconds, and blocks it silently — a disconnect loop would spend the
   * budget and then look like a band that simply stopped existing. Ten
   * seconds between starts keeps that from ever being the explanation.
   */
  private rescan() {
    if (!this.running || this.scanning || this.rescanTimer) return;
    const wait = Math.max(0, 10_000 - (Date.now() - this.scanStartedAt));
    this.rescanTimer = setTimeout(() => {
      this.rescanTimer = null;
      void this.scan().catch((e) => console.error("[ble] rescan failed", e));
    }, wait);
  }

  async stop() {
    this.running = false;
    this.scanning = false;
    if (this.rescanTimer) clearTimeout(this.rescanTimer);
    this.rescanTimer = null;
    try {
      await BleClient.stopLEScan();
    } catch {
      // Not scanning. Nothing to stop is not a failure.
    }
    for (const [device, id] of Object.entries(this.id)) {
      if (!id) continue;
      try {
        await BleClient.disconnect(id);
      } catch {
        // Already gone.
      }
      this.link(device as Device, "idle");
    }
    this.id = {};
    this.listeners.clear();
  }

  private async saw(r: ScanResult) {
    const uuids = (r.uuids ?? []).map((u) => u.toLowerCase());
    const device: Device | null = uuids.includes(BAND_SERVICE)
      ? "band"
      : uuids.includes(BEDSIDE_SERVICE)
        ? "bedside"
        : null;
    if (!device) return;

    // §2.1: the band broadcasts its escalation stage, so a phone that lost
    // the link mid-ALERT can still read the real stage without
    // reconnecting. Read on every sighting, attached or not — this is the
    // path whose whole purpose is to survive the connection failing.
    if (device === "band") {
      const md = r.manufacturerData?.[COMPANY];
      const adv = md ? decodeAdvertisement(bytes(md)) : null;
      if (adv)
        this.emit({
          kind: "escalation",
          data: {
            at: Date.now(),
            stage: Math.min(4, adv.stage) as 0 | 1 | 2 | 3 | 4,
            reason: "none",
          },
        });
    }

    if (this.id[device]) return;
    this.id[device] = r.device.deviceId;
    try {
      await this.attach(device, r.device.deviceId);
    } catch (e) {
      console.error(`[ble] ${device} would not attach`, e);
      delete this.id[device];
      this.link(device, "lost");
    }
  }

  private async attach(device: Device, id: string) {
    await BleClient.connect(id, () => {
      // §5.5: monitoring continues while the band is away. The ladder is
      // running on the wrist whether we can hear it or not.
      delete this.id[device];
      this.link(device, "lost");
      this.rescan();
    });

    // §1: bonded, so a reconnect at 3am does not ask anybody to pair.
    try {
      if (!(await BleClient.isBonded(id))) await BleClient.createBond(id);
    } catch (e) {
      // Some stacks bond implicitly on first encryption instead. Not fatal.
      console.warn("[ble] bond declined", e);
    }

    // ponytail: no 20-byte fallback. Every write this app makes is small
    // JSON. The only payload needing the full 185 is the ECG stream, which
    // is notify-only and will simply not arrive on a stack that refuses to
    // negotiate — logged so that shows up as a number rather than a
    // mystery. Add chunking if a phone turns up that cannot reach 185.
    try {
      console.log(`[ble] ${device} mtu`, await BleClient.getMtu(id));
    } catch {
      // Not every platform reports it.
    }

    if (device === "band") await this.attachBand(id);
    else await this.attachBedside(id);

    this.link(device, "connected");
    await this.idle();
  }

  private async attachBand(id: string) {
    const at = () => Date.now();
    const notify = (c: string, fn: (v: DataView) => void) =>
      BleClient.startNotifications(id, BAND_SERVICE, c, fn);

    await notify(B.vitals, (v) => {
      for (const s of decodeVitals(bytes(v), at())) this.emit({ kind: "vitals", data: s });
    });
    await notify(B.oxygen, (v) => this.emit({ kind: "oxygen", data: decodeOxygen(bytes(v), at()) }));
    await notify(B.motion, (v) => this.emit({ kind: "motion", data: decodeMotion(bytes(v), at()) }));
    await notify(B.sos, (v) => {
      if (decodeSosPress(bytes(v))) this.emit({ kind: "sos", data: { at: at() } });
    });
    await notify(B.escalation, (v) =>
      this.emit({ kind: "escalation", data: decodeEscalation(bytes(v), at()) }),
    );
    await notify(B.status, (v) =>
      this.emit({ kind: "band-status", data: decodeBandStatus(bytes(v), at()) }),
    );
    await notify(B.ecg, (v) => this.emit({ kind: "ecg", ...decodeEcg(bytes(v)) }));
    await notify(B.buffer, (v) => this.buffered(id, bytes(v)));

    // §3.8: sent on every connect, not once at pairing. An ESP32-C3 loses
    // its clock on a flat battery, and then every offline event it
    // recorded arrives stamped from 1970 — which breaks settle_time_s,
    // which breaks the only evidence the learning loop works at all.
    await this.command({ cmd: "sync_time", epochS: Math.floor(Date.now() / 1000) });

    // §3.9. Ask for whatever happened while nobody was listening.
    this.flushing = [];
    await this.write(id, BAND_SERVICE, B.buffer, flushStart());
  }

  private async attachBedside(id: string) {
    const at = () => Date.now();
    await BleClient.startNotifications(id, BEDSIDE_SERVICE, D.room, (v) =>
      this.emit({ kind: "room", data: decodeRoom(bytes(v), at()) }),
    );
    await BleClient.startNotifications(id, BEDSIDE_SERVICE, D.snore, (v) =>
      this.emit({ kind: "snore", data: { at: at(), flagged: decodeSnore(bytes(v), at()).flagged } }),
    );
    await BleClient.startNotifications(id, BEDSIDE_SERVICE, D.ack, (v) =>
      this.emit({ kind: "ack", ...decodeAck(bytes(v)) }),
    );
  }

  /**
   * §3.9. The burst closes on a sentinel and only then is the ACK sent.
   * The band erases nothing until it has one, so a connection dropped
   * mid-flush costs a repeat rather than a night.
   */
  private buffered(id: string, raw: Uint8Array) {
    const packet = decodeBufferPacket(raw);
    if (!this.flushing) this.flushing = [];

    if (!packet.sentinel) {
      this.flushing.push(...packet.entries);
      this.lastSeq = packet.seq;
      return;
    }

    const events = replay(this.flushing);
    this.flushing = null;
    if (events.length) this.emit({ kind: "buffered", events });

    void this.write(id, BAND_SERVICE, B.buffer, flushAck(this.lastSeq)).catch((e) =>
      console.error("[ble] flush ack failed — the band keeps its buffer, which is the point", e),
    );
  }

  /** The last real sequence number seen, which is what the ACK names. */
  private lastSeq = 0;

  private write(id: string, service: string, characteristic: string, data: Uint8Array) {
    return BleClient.write(id, service, characteristic, view(data));
  }

  async send(a: Actuator) {
    const id = this.id.bedside;
    if (!id) return;
    await this.write(id, BEDSIDE_SERVICE, D.actuator, encodeActuator(a, this.nextCommandId++));
  }

  async command(c: BandCommand) {
    const id = this.id.band;
    if (!id) return;
    await this.write(id, BAND_SERVICE, B.command, encodeBandCommand(c));
  }

  async configure(c: BandConfig) {
    const id = this.id.band;
    if (!id) return;
    await this.write(id, BAND_SERVICE, B.config, encodeBandConfig(c));
  }
}
