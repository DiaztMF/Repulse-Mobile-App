import { BleClient, type ScanResult } from "@capacitor-community/bluetooth-le";
import { Capacitor } from "@capacitor/core";
import {
  decodeAck,
  decodeAdvertisement,
  decodeBandStatus,
  decodeBufferPacket,
  decodeEcg,
  readable,
  type Packet,
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
  encodePing,
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

/** §2.1. Three missed beats inside the devices' 30-second window. */
const HEARTBEAT_MS = 10_000;

const bytes = (v: DataView) => new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
const view = (u: Uint8Array) => new DataView(u.buffer, u.byteOffset, u.byteLength);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  /** Characteristics already complained about, so a fault firing at
   *  40 Hz does not bury itself in its own log. */
  private warned = new Set<Packet>();

  /**
   * Web Bluetooth instead of Android's stack, and the difference is not a
   * detail: there is no continuous scan a page may start, and no device a
   * page may reach without a person picking it out of the browser's own
   * chooser first.
   *
   * So on the web this transport finds nothing by itself. It waits to be
   * asked, once per device, from a real tap. Everything after that
   * (connect, subscribe, write) is the same code the phone runs, because
   * the plugin backs all three with Web Bluetooth calls that behave the
   * same way.
   *
   * What the browser cannot do at all: run with the tab closed. That is
   * why the phone is still what watches a night, and the site is what
   * demonstrates one.
   */
  private readonly web = !Capacitor.isNativePlatform();

  /**
   * Devices the browser has granted this origin, by our name for them.
   *
   * Kept apart from `id`, which is emptied whenever a link drops, because
   * a grant outlives the connection: Chrome lets a page reconnect to a
   * device somebody has already chosen without asking again. Holding the
   * id here is what makes a dropped band come back on its own instead of
   * demanding another trip through the chooser.
   */
  private granted: Partial<Record<Device, string>> = {};

  private scanning = false;
  /** The adapter's own switch. Null until it has answered once. */
  private enabled: boolean | null = null;
  private scanStartedAt = 0;
  private rescanTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

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
    // Claimed before the first await, so two screens starting at once do
    // not both ask Android to switch Bluetooth on.
    this.running = true;
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
    } catch (e) {
      // Permission refused. Released so a later attempt can ask again.
      this.running = false;
      throw e;
    }
    this.heartbeat = setInterval(() => this.beat(), HEARTBEAT_MS);

    /* `startEnabledNotifications` and `requestEnable` both throw
     * "not available on web" — a browser is not allowed to know whether
     * the adapter is on, let alone switch it on. `initialize` above has
     * already refused if there is no radio at all, so reaching here is as
     * much as the web can be told. */
    if (this.web) {
      this.enabled = true;
      this.emit({ kind: "radio", on: true });
      return;
    }

    /* Bluetooth switched off is a state to wait out, not a failure.
     *
     * The plugin starts its scan through a scanner that is null while the
     * adapter is off, and still answers "Started scanning." So a start with
     * Bluetooth off left `scanning` true on a scan that never existed, and
     * switching Bluetooth on afterwards found this transport already
     * running, already scanning, and doing neither until the app was
     * killed. A toggle in the middle of the night did the same, silently.
     * Following the adapter is what makes both recover on their own. */
    await BleClient.startEnabledNotifications((on) => void this.radio(on));
    await this.radio(await BleClient.isEnabled());
    if (this.enabled) return;
    try {
      // Android's own "allow RePulse to turn on Bluetooth?" — one tap
      // instead of a trip to quick settings. The listener above hears the
      // answer, and a switch flipped by hand later just the same.
      await BleClient.requestEnable();
    } catch {
      // Declined. The screens say Bluetooth is off; there is nothing to add.
    }
  }

  /** Every change of the adapter, and its state at start. */
  private async radio(on: boolean) {
    if (!this.running || on === this.enabled) return;
    this.enabled = on;
    this.emit({ kind: "radio", on });

    if (on) {
      this.link("band", "scanning");
      this.link("bedside", "scanning");
      await this.scan().catch((e) => console.error("[ble] scan failed", e));
      return;
    }

    /* Every link died with the adapter. Forgotten here so the first sighting
     * after it comes back attaches again, and so the next scan is a real
     * one rather than a guard remembering a scan the OS already ended. */
    this.scanning = false;
    if (this.rescanTimer) clearTimeout(this.rescanTimer);
    this.rescanTimer = null;
    this.id = {};
    this.link("band", "idle");
    this.link("bedside", "idle");
  }

  /**
   * One scan for both devices, filtered on the service UUID and never the
   * name. §2 is blunt about it: a device whose advertisement omits the
   * UUID is one this app will never find, and that is the contract the
   * firmware is held to.
   */
  private async scan() {
    if (this.web) return this.reattach();
    if (this.scanning || !this.running || !this.enabled) return;
    this.scanning = true;
    this.scanStartedAt = Date.now();
    console.log("[ble] scanning");
    try {
      await BleClient.requestLEScan(
        { services: [BAND_SERVICE, BEDSIDE_SERVICE], allowDuplicates: true },
        (r) => void this.saw(r),
      );
    } catch (e) {
      // Left true, the guard above would refuse every scan after this one.
      this.scanning = false;
      throw e;
    }
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
    if (this.web) return;
    if (!this.scanning) return;
    if (this.state.band !== "connected" || this.state.bedside !== "connected") return;
    this.scanning = false;
    console.log("[ble] both attached, scan stopped");
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

  /** The manual "look again". `start` is idempotent, so a radio that never
   *  came up gets its chance here too — which is the state a tap after
   *  switching Bluetooth on by hand lands in. */
  async retry() {
    if (!this.running) {
      await this.start();
      if (this.web) await this.ask();
      return;
    }
    /* On the web this IS the gesture. Called straight out of a tap, which
     * is the only context the browser will open its chooser in. */
    if (this.web) {
      await this.ask();
      return;
    }
    if (this.enabled === false) {
      try {
        await BleClient.requestEnable();
      } catch {
        // Declined. The screen already says Bluetooth is off.
      }
      return;
    }
    /* A device stuck "connected" in our books but gone in Android's is the
     * case a rescan alone cannot fix: the id is still held, so every
     * sighting is ignored as already-attached. Nothing is dropped here —
     * `saw` only ignores what we believe we hold. */
    for (const d of ["band", "bedside"] as Device[]) {
      if (this.state[d] !== "connected" && this.id[d]) {
        const id = this.id[d]!;
        delete this.id[d];
        try {
          await BleClient.disconnect(id);
        } catch {
          // Already gone, which is what we were asking for.
        }
      }
    }
    this.rescan();
  }

  /**
   * Ask for the next device that is not attached, band before bedside.
   *
   * One per tap, because `requestDevice` resolves to exactly one device
   * and each call needs its own gesture. Two taps attach both, which is
   * the whole shape of the difference from the phone: there the single
   * scan finds both and attaches them unasked.
   */
  private async ask() {
    const device: Device | null =
      this.state.band !== "connected"
        ? "band"
        : this.state.bedside !== "connected"
          ? "bedside"
          : null;
    if (!device) return;

    // Already chosen once, so no chooser: straight back on.
    if (this.granted[device]) {
      await this.reattach();
      return;
    }

    const service = device === "band" ? BAND_SERVICE : BEDSIDE_SERVICE;
    this.link(device, "scanning");
    let found;
    try {
      /* `services` filters the chooser down to our own firmware, so the
       * list holds the band and nothing else in the building. It also has
       * to appear in `optionalServices`: on the web a service absent from
       * both lists cannot be read or written even after connecting. */
      found = await BleClient.requestDevice({
        services: [service],
        optionalServices: [service],
      });
    } catch (e) {
      /* Cancelling the chooser lands here, and a person closing a dialog
       * is not a fault. Back to idle so the button offers itself again. */
      this.link(device, "idle");
      console.log(`[ble] ${device} chooser closed without a pick`, e);
      return;
    }

    this.granted[device] = found.deviceId;
    this.id[device] = found.deviceId;
    console.log(`[ble] ${device} chosen, attaching`);
    this.attaching = this.attaching.then(() =>
      this.attachOrDrop(device, found.deviceId),
    );
    await this.attaching;
  }

  /**
   * Reconnect every granted device that is not attached, with no chooser.
   *
   * This is what the web gets in place of a rescan, and it is reached by
   * the same paths: the disconnect callback, `release`, and the retry
   * button, all of which already route through `rescan` and its ten-second
   * spacing. A device nobody has chosen yet is skipped, because reaching
   * one needs a tap and this can run from a timer.
   */
  private async reattach() {
    for (const device of ["band", "bedside"] as Device[]) {
      if (this.state[device] === "connected") continue;
      const id = this.granted[device];
      if (!id || this.id[device]) continue;
      this.id[device] = id;
      console.log(`[ble] ${device} reattaching to a device already granted`);
      this.attaching = this.attaching.then(() => this.attachOrDrop(device, id));
      await this.attaching;
    }
  }

  async release(device: Device) {
    const id = this.id[device];
    if (!id) return;
    delete this.id[device];
    /* The grant goes too, or Disconnect would not disconnect: `rescan`
     * below reaches `reattach`, which puts every granted device straight
     * back on. Asking again costs one trip through the chooser, which is
     * the honest price of having said stop. */
    if (this.web) delete this.granted[device];
    try {
      await BleClient.disconnect(id);
    } catch {
      // Already gone, which is the state we were asking for.
    }
    this.link(device, "idle");
    /* Scanning may have stopped once both were attached, and without this
     * a released device could never be found again. */
    this.rescan();
  }

  async stop() {
    this.running = false;
    this.scanning = false;
    this.enabled = null;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    try {
      await BleClient.stopEnabledNotifications();
    } catch {
      // Never started. Nothing to stop.
    }
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
    this.granted = {};
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
    /* The one line that tells "never advertised" apart from "found and
     * then failed". Without it a device missing from the log is both, and
     * the two have nothing in common to fix. */
    console.log(`[ble] ${device} seen, attaching`);

    /* One attach at a time, never two.
     *
     * Both devices are found by one scan, and each sighting used to start
     * its own attach immediately — so the band's service discovery and
     * subscriptions interleaved with the bedside's. Android's GATT stack
     * does not hold up under that: the console showed both chains running
     * together and the band's second subscription coming back
     * "Characteristic not found" for a characteristic the firmware plainly
     * registers. A device found second now simply waits its turn.
     *
     * The queue is per transport and never rejects, so one device failing
     * to attach cannot stop the other from trying. */
    this.attaching = this.attaching.then(() => this.attachOrDrop(device, r.device.deviceId));
    await this.attaching;
  }

  private attaching: Promise<void> = Promise.resolve();

  private async attachOrDrop(device: Device, id: string) {
    try {
      await this.attach(device, id);
    } catch (e) {
      console.error(`[ble] ${device} would not attach`, e);
      delete this.id[device];
      /* The link is open by this point — `connect` is the first thing
       * `attach` does, and only what follows it can fail. Leaving it open
       * wedges both ends: the device reports an attached app that is
       * listening to nothing and stops advertising, so the retry never
       * sees it again, and its serial log flatly contradicts the phone. */
      try {
        await BleClient.disconnect(id);
      } catch {
        // Already gone, which is the state we wanted anyway.
      }
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

    /* Bonding is deliberately not forced.
     *
     * It used to be, for "a reconnect at 3am does not ask anybody to
     * pair" — but not one characteristic on either device requires
     * encryption or authentication. All ten are plain NOTIFY, WRITE, READ
     * and INDICATE. A bond therefore unlocks nothing, and a reconnect
     * never asks anybody to pair with or without it.
     *
     * What it did buy was a loop. Bonding is the most vendor-divergent
     * corner of the Android stack, and on some builds createBond against
     * an already-connected LE device tears the link down to re-pair. The
     * disconnect callback then fires, the link is marked lost, the scan
     * restarts, the device is found, and isBonded is still false because
     * the bond never completed — so it bonds again, and drops again. Off,
     * on, off, on, for as long as the phone is willing.
     *
     * Losing the bond costs one thing: Android re-discovers services on
     * each connect instead of reading its cache. That is slower by
     * milliseconds and cannot be wrong, which is the better trade. */

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

    /* A settle beat before the first GATT request.
     *
     * The band's attach walks ten sequential round trips — eight
     * subscriptions plus `sync_time` and `flush_start` — starting the
     * instant MTU is negotiated. The bedside's is three. That difference
     * is the whole story in a real log: bedside reconnects clean every
     * time, and the band drops mid-burst with "Not connected to device."
     * after MTU had already come back — Android's own connection state,
     * not a plugin timeout, giving up before request nine or ten.
     *
     * A freshly negotiated LE link has not yet had a connection event to
     * settle its interval on, and ten writes fired back to back before
     * one happens is exactly the burst that trips it. Bedside's shorter
     * walk usually finishes inside that same window and gets away with
     * it; band never does.
     *
     * ponytail: one flat delay, not a retry loop or per-write pacing —
     * the log shows a single stall point, not a flaky one. If a phone
     * still drops it, add a pause between each of the band's individual
     * `startNotifications` calls next, not a longer flat delay here. */
    await sleep(device === "band" ? 400 : 150);

    if (device === "band") await this.attachBand(id);
    else await this.attachBedside(id);

    this.link(device, "connected");
    await this.idle();
  }

  /**
   * Every notification enters here, and this is the only place bytes off
   * the air are trusted.
   *
   * Two guards, because they catch different failures. The length check is
   * the real one: a packet shorter than §3 promises cannot be decoded, and
   * the decoders index straight into a DataView, so three of them threw
   * RangeError and one read a torn two-byte packet as an escalation to
   * stage 3. The catch behind it is for everything I have not thought of —
   * an exception raised in a notification callback takes the stream down
   * for the rest of the night, and a night is worth more than a packet.
   *
   * Logged once per characteristic. A firmware fault that fires at 40 Hz
   * would otherwise fill the console and hide itself.
   */
  private take(kind: Packet, v: DataView, fn: (b: Uint8Array) => void) {
    const b = bytes(v);
    if (!readable(kind, b)) {
      if (!this.warned.has(kind)) {
        this.warned.add(kind);
        console.warn(`[ble] ${kind} arrived in ${b.length} bytes, too short to read, dropped`);
      }
      return;
    }
    try {
      fn(b);
    } catch (e) {
      if (!this.warned.has(kind)) {
        this.warned.add(kind);
        console.error(`[ble] ${kind} would not decode`, e);
      }
    }
  }

  private async attachBand(id: string) {
    const at = () => Date.now();
    const notify = (c: string, kind: Packet, fn: (b: Uint8Array) => void) =>
      BleClient.startNotifications(id, BAND_SERVICE, c, (v) => this.take(kind, v, fn));

    await notify(B.vitals, "vitals", (b) => {
      for (const s of decodeVitals(b, at())) this.emit({ kind: "vitals", data: s });
    });
    await notify(B.oxygen, "oxygen", (b) => this.emit({ kind: "oxygen", data: decodeOxygen(b, at()) }));
    await notify(B.motion, "motion", (b) => this.emit({ kind: "motion", data: decodeMotion(b, at()) }));
    await notify(B.sos, "sos", (b) => {
      if (decodeSosPress(b)) this.emit({ kind: "sos", data: { at: at() } });
    });
    await notify(B.escalation, "escalation", (b) =>
      this.emit({ kind: "escalation", data: decodeEscalation(b, at()) }),
    );
    await notify(B.status, "status", (b) =>
      this.emit({ kind: "band-status", data: decodeBandStatus(b, at()) }),
    );
    await notify(B.ecg, "ecg", (b) => this.emit({ kind: "ecg", ...decodeEcg(b) }));
    await notify(B.buffer, "buffer", (b) => this.buffered(id, b));

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
      this.take("room", v, (b) => this.emit({ kind: "room", data: decodeRoom(b, at()) })),
    );
    await BleClient.startNotifications(id, BEDSIDE_SERVICE, D.snore, (v) =>
      this.take("snore", v, (b) =>
        this.emit({ kind: "snore", data: { at: at(), flagged: decodeSnore(b, at()).flagged } }),
      ),
    );
    await BleClient.startNotifications(id, BEDSIDE_SERVICE, D.ack, (v) =>
      this.take("ack", v, (b) => this.emit({ kind: "ack", ...decodeAck(b) })),
    );
  }

  /**
   * §3.9. The burst closes on a sentinel and only then is the ACK sent.
   * The band erases nothing until it has one, so a connection dropped
   * mid-flush costs a repeat rather than a night.
   */
  private buffered(id: string, raw: Uint8Array) {
    const packet = decodeBufferPacket(raw);

    if (!packet.sentinel) {
      if (!this.flushing) this.flushing = [];
      this.flushing.push(...packet.entries);
      this.lastSeq = packet.seq;
      return;
    }

    /* Replayed once, acknowledged every time.
     *
     * §3.9 has the band hold its buffer until the ACK lands, and resend the
     * sentinel until it does. So a repeated sentinel means our answer never
     * arrived, and staying silent would leave the band waiting forever with
     * a night it will not release. It gets another ACK.
     *
     * What must not repeat is the replay. Emitting the entries again would
     * put every rescued event on the timeline twice, and §11 already forbids
     * an offline event from arriving as though it were new — arriving twice
     * is worse. Clearing first is what makes the second sentinel harmless. */
    const pending = this.flushing;
    this.flushing = null;
    if (pending) {
      const events = replay(pending);
      if (events.length) this.emit({ kind: "buffered", events });
    }

    void this.write(id, BAND_SERVICE, B.buffer, flushAck(this.lastSeq)).catch((e) =>
      console.error("[ble] flush ack failed, the band keeps its buffer, which is the point", e),
    );
  }

  /**
   * §2.1: tells both devices this app is alive, not merely connected.
   *
   * Android stops this JavaScript once the screen is off, while the native
   * side keeps every GATT link open and confirms the band's Indicates on
   * its own. A connection alone therefore proved nothing: the band kept
   * reporting a phone, the bedside kept deferring to it, and the siren that
   * could have sounded stayed quiet behind an app that could not hear.
   *
   * This interval stops with the JavaScript, and that silence is the
   * signal — thirty seconds of it hands the siren back to the bedside.
   * Sent only to a device that has finished attaching, so a beat never
   * lands in the middle of its subscriptions.
   */
  private beat() {
    if (this.state.band === "connected") {
      void this.command({ cmd: "ping" }).catch(() => {});
    }
    const bedside = this.id.bedside;
    if (bedside && this.state.bedside === "connected") {
      void this.write(bedside, BEDSIDE_SERVICE, D.actuator, encodePing()).catch(() => {});
    }
  }

  /** The last real sequence number seen, which is what the ACK names. */
  private lastSeq = 0;

  private write(id: string, service: string, characteristic: string, data: Uint8Array) {
    return BleClient.write(id, service, characteristic, view(data));
  }

  async send(a: Actuator, opts?: { unclamped?: boolean }) {
    const id = this.id.bedside;
    if (!id) return;
    await this.write(
      id,
      BEDSIDE_SERVICE,
      D.actuator,
      encodeActuator(a, this.nextCommandId++, opts),
    );
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
