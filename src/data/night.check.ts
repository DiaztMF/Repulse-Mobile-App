/** Run: npm run check:night
 *
 *  A night takes eight hours to happen and the aggregation gets one
 *  attempt at it. Everything here is driven through the same `feed` the
 *  live transport calls, at real millisecond spacing, so the ledgers are
 *  exercised the way the radio will exercise them.
 */
import assert from "node:assert/strict";
import { NightRecorder, nightDate } from "./night.ts";
import type { BleEvent } from "@/ble/transport";

const MIN = 60_000;
const start = new Date(2026, 7, 19, 22, 30).getTime(); // 19 Aug 2026, 22:30 local

const vitals = (bpm: number, rrMs: number, worn = true): BleEvent => ({
  kind: "vitals",
  data: { at: 0, bpm, rrMs, worn, signalQuality: 12 },
});
const motion = (levelMg: number): BleEvent => ({ kind: "motion", data: { at: 0, levelMg } });
const room = (lux: number): BleEvent => ({
  kind: "room",
  data: { at: 0, tempC: null, humidityPct: null, lux, db: 40 },
});

/** Walks the recorder forward one second at a time, which is roughly what
 *  the band does and is the only way the millisecond ledgers mean
 *  anything. Room readings arrive once a minute, per §4.1. */
function run(r: NightRecorder, minutes: number, at: number, each: (sec: number) => BleEvent[]) {
  const seconds = minutes * 60;
  for (let s = 0; s < seconds; s++) {
    for (const e of each(s)) r.feed(e, at + s * 1000);
  }
  return at + seconds * 1000;
}

// --- a plain night -------------------------------------------------------

{
  const r = new NightRecorder(start);
  // 400 minutes: still, dark, a steady pulse.
  let at = run(r, 400, start, (s) => [vitals(58, 1030), motion(40), ...(s % 60 === 0 ? [room(0.4)] : [])]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.sleep.durationMin, 400);
  assert.equal(n.date, "2026-08-19", "filed under the evening it began");

  // The claim this build refuses to make.
  assert.equal(n.sleep.deep, null, "no EEG, no deep sleep");
  assert.equal(n.sleep.rem, null);
  assert.equal(n.sleep.light, null);

  assert.equal(n.sleep.awake, 0, "40 mg is a sleeping body");
  assert.equal(n.heart.avg, 58);
  assert.equal(n.heart.resting, 58);
  assert.equal(n.light.darkOptimalMin, 400, "0.4 lux is under the 3 lux line");
  assert.equal(n.light.pollutionMin, 0);
  assert.equal(n.counts.offlineMin, 0);
  assert.ok(n.score !== null && n.score > 60, "a quiet night scores above the base");
}

// --- movement becomes awake, not a sleep stage ---------------------------

{
  const r = new NightRecorder(start);
  let at = run(r, 60, start, () => [vitals(56, 1050), motion(30)]);
  // Half an hour of thrashing.
  at = run(r, 30, at, () => [vitals(72, 900), motion(900)]);
  at = run(r, 60, at, () => [vitals(56, 1050), motion(30)]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.sleep.durationMin, 150);
  assert.equal(n.sleep.awake, 30, "movement above the line is awake time");
  assert.equal(n.heart.max, 72);
  assert.equal(n.heart.min, 56);
}

// --- an unworn band is not a heart rate of zero --------------------------

{
  const r = new NightRecorder(start);
  const at = run(r, 300, start, (s) => [vitals(0, 0, false), motion(5), ...(s % 60 === 0 ? [room(0.2)] : [])]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.score, null, "nothing measured the sleeper");
  assert.equal(n.heart.avg, 0);
  assert.deepEqual(n.contributors, [], "nothing to attribute a score to");
  assert.equal(n.light.darkOptimalMin, 300, "the room was still recorded");
  assert.match(n.insight, /not worn/);
}

// --- light leaking in ----------------------------------------------------

{
  const r = new NightRecorder(start);
  let at = run(r, 40, start, (s) => [vitals(60, 1000), motion(20), ...(s % 60 === 0 ? [room(9)] : [])]);
  at = run(r, 200, at, (s) => [vitals(60, 1000), motion(20), ...(s % 60 === 0 ? [room(0.5)] : [])]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.light.pollutionMin, 40);
  assert.equal(n.light.darkOptimalMin, 200);
  assert.match(n.insight, /Light was leaking/);
}

// --- the band drops off the air -----------------------------------------

{
  const r = new NightRecorder(start);
  let at = run(r, 60, start, () => [vitals(58, 1020), motion(20)]);
  r.feed({ kind: "link", device: "band", state: "lost" }, at);
  at = run(r, 90, at, () => [motion(20)]);
  r.feed({ kind: "link", device: "band", state: "connected" }, at);
  at = run(r, 60, at, () => [vitals(58, 1020), motion(20)]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.counts.offlineMin, 90, "the gap is recorded, not hidden");
  assert.equal(n.sleep.durationMin, 210, "and the night is still its full length");
}

// --- escalation, and the stand-down that is not one ----------------------

{
  const r = new NightRecorder(start);
  let at = run(r, 30, start, () => [vitals(58, 1020), motion(20)]);
  r.feed({ kind: "escalation", data: { at, stage: 2, reason: "threshold" } }, at);
  at += MIN;
  // Stage 0 is the ladder standing down. Counting it would double every
  // anomaly the body itself resolved.
  r.feed({ kind: "escalation", data: { at, stage: 0, reason: "none" } }, at);
  at = run(r, 30, at, () => [vitals(58, 1020), motion(20)]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.counts.anomaly, 1);
  assert.equal(n.events.filter((e) => e.type === "anomaly").length, 1);
}

// --- snoring is measured in minutes, not in notifications ----------------

{
  const r = new NightRecorder(start);
  let at = run(r, 20, start, () => [vitals(58, 1020), motion(20)]);
  r.feed({ kind: "snore", data: { at, flagged: true } }, at);
  at = run(r, 25, at, () => [vitals(58, 1020), motion(20)]);
  r.feed({ kind: "snore", data: { at, flagged: false } }, at);
  at = run(r, 20, at, () => [vitals(58, 1020), motion(20)]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.breathing.snoreMin, 25);
  assert.equal(n.events.filter((e) => e.type === "snore").length, 1, "one spell, one entry");
}

// --- comfort events, and where they sit on the timeline ------------------

{
  const r = new NightRecorder(start);
  let at = run(r, 90, start, () => [vitals(58, 1020), motion(20)]);
  r.comfort(at, "white_noise", 180, false);
  at = run(r, 60, at, () => [vitals(58, 1020), motion(20)]);
  r.comfort(at, "aroma", null, true);
  at = run(r, 30, at, () => [vitals(58, 1020), motion(20)]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.counts.restless, 2);
  const [first, second] = n.events.filter((e) => e.type === "comfort");
  assert.equal(first!.at, 90, "minutes after sleep started, not a wall clock");
  assert.equal(first!.settleSec, 180);
  assert.equal(second!.at, 150);
  assert.equal(second!.offline, true, "§5.3: the bedside was unreachable, and it shows");
}

// --- positions share the night out ---------------------------------------

{
  const r = new NightRecorder(start);
  const ox = (position: "left" | "supine"): BleEvent => ({
    kind: "oxygen",
    data: { at: 0, spo2Pct: 96, position },
  });
  let at = run(r, 100, start, () => [vitals(58, 1020), motion(20), ox("left")]);
  at = run(r, 100, at, () => [vitals(58, 1020), motion(20), ox("supine")]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.positions.left + n.positions.supine, 200);
  assert.equal(n.positions.prone, 0);
  assert.equal(n.positions.right, 0);
}

// --- a gap is not a reading that held ------------------------------------
//
// Notifications stop when the phone sleeps the radio or the band walks out
// of range. Integrating across that would credit the whole silence to
// whichever ledger happened to be open.
{
  const r = new NightRecorder(start);
  r.feed(motion(900), start);
  const n = r.finish(start + 120 * MIN, nightDate(start));
  assert.equal(n.sleep.durationMin, 120);
  assert.equal(n.sleep.awake, 0, "two silent hours are not two hours of thrashing");
}

// --- silence is what has to be counted -----------------------------------
//
// The band drops off the air and stops sending anything at all, so nothing
// arrives to advance the ledgers. Without the app keeping its own clock,
// the offline minutes would be measured by the very events whose absence
// defines them, and every dropout would record as zero.
{
  const r = new NightRecorder(start);
  let at = run(r, 10, start, () => [vitals(58, 1020), motion(20)]);
  r.feed({ kind: "link", device: "band", state: "lost" }, at);
  // Nothing but the app's own heartbeat for the next hour.
  for (let s = 5; s <= 3600; s += 5) r.tick(at + s * 1000);
  at += 3600 * 1000;
  const n = r.finish(at, nightDate(start));

  assert.equal(n.counts.offlineMin, 60, "an hour of nothing is an hour of nothing");
  assert.equal(n.sleep.durationMin, 70);
  assert.equal(n.sleep.awake, 0, "a lost band is not a thrashing sleeper");
}

// --- the date belongs to the evening, not to UTC -------------------------
//
// A session starting at 23:40 in Jakarta is 16:40 UTC the same day, but one
// starting at 07:10 would file under the previous day if this used
// toISOString. The failure only appears for people east of Greenwich, which
// is to say for everyone this is built for.
{
  const late = new Date(2026, 7, 19, 23, 40).getTime();
  assert.equal(nightDate(late), "2026-08-19");
  const early = new Date(2026, 7, 20, 7, 10).getTime();
  assert.equal(nightDate(early), "2026-08-20");
}

console.log("ok — a night aggregates from its own events, and claims nothing it cannot measure");
