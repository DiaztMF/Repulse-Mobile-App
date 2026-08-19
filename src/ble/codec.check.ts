/** Run: npm run check:codec
 *
 *  Every buffer below is built by hand from the tables in
 *  `BLE_GATT_CONTRACT.md`, using the contract's own worked examples where
 *  it gives them — 0.42 g is 420, 29.1 °C is 291, 0.4 lux is 40.
 *
 *  This is the file that earns its keep on integration day. Interfaces
 *  agree easily; byte layouts do not. When the firmware arrives and
 *  something disagrees, the failing assertion names the characteristic and
 *  the field, which is the difference between ten minutes and a lost
 *  evening.
 */
import assert from "node:assert/strict";
import {
  FLUSH_SENTINEL,
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
  replay,
} from "./codec.ts";

const at = 1_700_000_000_000;
const u8 = (...b: number[]) => Uint8Array.from(b);
/** Little-endian, per §1, everywhere except where the contract spells out
 *  bytes individually. */
const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];

// --- §3.1 vitals: status byte, then up to five 3-byte samples ------------

// worn = bit 7, signal_quality = bits 3-0. 0b1000_1100 = worn, quality 12.
const vitals = decodeVitals(u8(0b1000_1100, 62, ...le16(968), 63, ...le16(952)), at);
assert.equal(vitals.length, 2, "both samples in the batch are decoded");
assert.deepEqual(vitals[0], { at, bpm: 62, rrMs: 968, worn: true, signalQuality: 12 });
assert.equal(vitals[1]!.rrMs, 952);

// The flag that stops a band on a table from raising an ALERT. To a
// MAX30102, "no pulse" and "not being worn" look identical.
assert.equal(decodeVitals(u8(0b0000_1100, 0, ...le16(0)), at)[0]!.worn, false);
assert.equal(decodeVitals(u8(0b1000_0000, 62, ...le16(968)), at)[0]!.signalQuality, 0);

// --- §3.2 oxygen ---------------------------------------------------------

assert.deepEqual(decodeOxygen(u8(96, 1), at), { at, spo2Pct: 96, position: "left" });
assert.equal(decodeOxygen(u8(0, 255), at).position, "unknown");
// 0 means "not valid", never "zero percent" — the caller has to be able to
// tell those apart.
assert.equal(decodeOxygen(u8(0, 0), at).spo2Pct, 0);

// --- §3.3 motion: the contract's own example, 0.42 g -> 420 -------------

assert.equal(decodeMotion(u8(...le16(420)), at).levelMg, 420);

// --- §3.5 escalation, §3.4 SOS ------------------------------------------

assert.deepEqual(decodeEscalation(u8(3, 1), at), { at, stage: 3, reason: "irregular" });
assert.deepEqual(decodeEscalation(u8(0, 0), at), { at, stage: 0, reason: "none" });
assert.equal(decodeEscalation(u8(4, 3), at).reason, "manual");
assert.equal(decodeSosPress(u8(1)), true);
assert.equal(decodeSosPress(u8(0)), false);

// --- §3.6 band status ----------------------------------------------------

assert.deepEqual(decodeBandStatus(u8(87, 0, ...le32(1_786_512_000)), at), {
  at,
  percent: 87,
  charging: false,
  epochS: 1_786_512_000,
});
// Zero means the clock was never set, which §3.6 says ruins settle times —
// and settle times are the learning loop's only proof.
assert.equal(decodeBandStatus(u8(87, 1, ...le32(0)), at).epochS, 0);

// --- §4.1 room: the contract's worked examples --------------------------

const room = decodeRoom(u8(...le16(291), ...le16(740), ...le32(40), 48), at);
assert.equal(room.tempC, 29.1);
assert.equal(room.humidityPct, 74);
assert.equal(room.lux, 0.4, "lux is x100, or optimal darkness stops meaning anything");
assert.equal(room.db, 48);
// Negative temperatures are int16, not uint16.
assert.equal(decodeRoom(u8(...le16(-15 & 0xffff), ...le16(500), ...le32(0), 30), at).tempC, -1.5);

// No DHT on the bedside means its initialisers go on the air unchanged, and
// 0.0 °C reads as a cold night rather than as a missing sensor. 0% RH is the
// impossible half of the pair, so it is the one that condemns both.
const noDht = decodeRoom(u8(...le16(0), ...le16(0), ...le32(180), 42), at);
assert.equal(noDht.humidityPct, null);
assert.equal(noDht.tempC, null, "one sensor, one verdict");
assert.equal(noDht.lux, 1.8, "the BH1750 is a different chip and keeps reporting");
assert.equal(noDht.db, 42);

// --- §4.2 snore, §4.4 ack ------------------------------------------------

assert.deepEqual(decodeSnore(u8(1, 63), at), { at, flagged: true, intensity: 63 });
assert.deepEqual(decodeAck(u8(42, 0)), { commandId: 42, status: "done" });
assert.deepEqual(decodeAck(u8(42, 2)), { commandId: 42, status: "refused" });

// --- §3.10 ECG -----------------------------------------------------------

const ecg = decodeEcg(u8(7, 0b1000_0000, ...le16(-120 & 0xffff), ...le16(340)));
assert.equal(ecg.seq, 7);
assert.equal(ecg.leadOn, true);
assert.deepEqual([...ecg.samples], [-120, 340], "samples are signed");
assert.equal(decodeEcg(u8(7, 0, 0, 0)).leadOn, false, "no contact is reported, not hidden");

// --- §3.9 offline buffer -------------------------------------------------

const entry = (epochS: number, type: number, p: number[]) => [...le32(epochS), type, ...p];
const packet = u8(
  ...le16(0),
  3,
  ...entry(1_786_512_000, 2, [3, 1, 0, 0]),
  ...entry(1_786_512_060, 4, [62, 96, 420 >> 8, 420 & 0xff]),
  ...entry(1_786_512_120, 5, [1, 0, 0, 0]),
);
const flushed = decodeBufferPacket(packet);
assert.equal(flushed.sentinel, false);
assert.equal(flushed.entries.length, 3);
assert.deepEqual(flushed.entries[0], {
  epochS: 1_786_512_000,
  type: "stage",
  stage: 3,
  reason: "irregular",
});
// The one quirk in the protocol: this payload is spelled out byte by byte
// as big-endian inside an otherwise little-endian contract. Getting it
// backwards would report 0.42 g of movement as 164 g.
assert.deepEqual(flushed.entries[1], {
  epochS: 1_786_512_060,
  type: "vitals",
  bpm: 62,
  spo2Pct: 96,
  levelMg: 420,
});
assert.deepEqual(flushed.entries[2], { epochS: 1_786_512_120, type: "link", connected: true });

const sentinel = decodeBufferPacket(u8(...le16(FLUSH_SENTINEL), 0));
assert.equal(sentinel.sentinel, true, "the burst closes on 0xFFFF");
assert.equal(sentinel.entries.length, 0);

// --- §2.1 advertisement --------------------------------------------------

const adv = decodeAdvertisement(u8(...le16(0xffff), 0x01, 3, 0b1000_0000))!;
assert.equal(adv.stage, 3, "the bedside can read the stage without connecting");
assert.equal(adv.worn, true);
assert.equal(adv.phoneConnected, false, "which is what lets the bedside siren alone");
assert.equal(decodeAdvertisement(u8(...le16(0x1234), 1, 0, 0)), null, "other vendors ignored");

// --- outbound: the aroma cap --------------------------------------------

const long = JSON.parse(new TextDecoder().decode(encodeActuator({ kind: "aroma", seconds: 60 }, 9)));
assert.equal(long.aroma.duration_s, 30, "a 60s request is clamped, never sent as 60");
assert.equal(long.command_id, 9, "the id the confirmation will echo");

const off = JSON.parse(new TextDecoder().decode(encodeActuator({ kind: "aroma", seconds: 0 }, 1)));
assert.equal(off.aroma.on, false);

const flash = JSON.parse(
  new TextDecoder().decode(encodeActuator({ kind: "light", mode: "white-flash" }, 2)),
);
assert.equal(flash.light.mode, "alert", "the contract's name, not ours");

// §3.8's keys, not TypeScript's. The payload is passed through verbatim, so
// `durationMs` on the air is a command the band never runs and never
// complains about.
const vibrate = JSON.parse(
  new TextDecoder().decode(encodeBandCommand({ cmd: "vibrate", pattern: "hard", durationMs: 800 })),
);
assert.deepEqual(vibrate, { cmd: "vibrate", pattern: "hard", duration_ms: 800 });

const sync = JSON.parse(
  new TextDecoder().decode(encodeBandCommand({ cmd: "sync_time", epochS: 1_786_512_000 })),
);
assert.deepEqual(sync, { cmd: "sync_time", epoch_s: 1_786_512_000 });

// --- §3.9 replay ----------------------------------------------------------
//
// The band's own timestamps have to survive into the timeline. PRD §11
// forbids an offline event from arriving as though it had just happened,
// and receipt times would stack a whole night into one second.
const replayed = replay([
  { epochS: 1_786_512_000, type: "stage", stage: 3, reason: "irregular" },
  { epochS: 1_786_512_060, type: "vitals", bpm: 58, spo2Pct: 95, levelMg: 300 },
  { epochS: 1_786_512_120, type: "sos" },
]);
assert.equal(replayed[0]!.kind, "escalation");
assert.equal(replayed[0]!.data.at, 1_786_512_000_000, "the band's clock, not ours");
assert.equal(replayed.filter((e) => e.kind === "vitals").length, 1);
assert.equal(replayed.filter((e) => e.kind === "motion").length, 1, "one sample carries both");
assert.equal(replayed.at(-1)!.kind, "sos");

// A stage above the enum would widen the union and reach the actuator
// matrix as a phase nothing handles.
assert.equal(replay([{ epochS: 1, type: "stage", stage: 9, reason: "none" }])[0]!.data.stage, 4);

// spo2 of 0 is "not valid" in §3.2, and a zero on an oxygen chart reads as
// a person who stopped breathing.
assert.equal(
  replay([{ epochS: 1, type: "vitals", bpm: 60, spo2Pct: 0, levelMg: 0 }]).some(
    (e) => e.kind === "oxygen",
  ),
  false,
);

console.log("ok — every characteristic decodes to the contract's own worked examples");
