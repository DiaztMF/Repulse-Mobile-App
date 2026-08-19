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

  // §8.1's coarse split, from `screening.stageOf`. A metronome pulse in a
  // still body is deep sleep, and the parts must add back up to the night.
  assert.equal(n.sleep.deep, 400, "still body, low RR spread");
  assert.equal(n.sleep.rem, 0);
  assert.equal(n.sleep.awake, 0, "40 mg is a sleeping body");
  assert.equal(
    n.sleep.deep + n.sleep.light + n.sleep.rem + n.sleep.awake,
    n.sleep.durationMin,
    "the bar cannot miss its own total",
  );
  assert.equal(n.heart.avg, 58);
  assert.equal(n.heart.resting, 58);
  // `darkness` measures the intervals between room samples, so it never
  // claims the stretch after the last one. 400 samples, 399 gaps.
  assert.equal(n.light.darkOptimalMin, 399, "0.4 lux is under the 3 lux line");
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
  assert.equal(n.sleep.awake, 30, "§8.1: average movement over 300 mg is awake");
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
  assert.equal(n.sleep.deep, 0, "an unworn band staged nothing");
  assert.deepEqual(n.contributors, [], "nothing to attribute a score to");
  assert.equal(n.light.darkOptimalMin, 299, "the room was still recorded");
  assert.match(n.insight, /not worn/);
}

// --- light leaking in ----------------------------------------------------

{
  const r = new NightRecorder(start);
  let at = run(r, 40, start, (s) => [vitals(60, 1000), motion(20), ...(s % 60 === 0 ? [room(9)] : [])]);
  at = run(r, 200, at, (s) => [vitals(60, 1000), motion(20), ...(s % 60 === 0 ? [room(0.5)] : [])]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.light.pollutionMin, 40);
  assert.equal(n.light.darkOptimalMin, 199);
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

// --- one episode that climbs is still one episode ------------------------
//
// §3.5 is a ladder: one anomaly reports stage 1, then 2, then 3, then 4 as
// it escalates. Counting the rungs instead of the climb files a single
// episode as four anomalies, writes four entries onto the timeline, and
// docks the score four times for it.
{
  const r = new NightRecorder(start);
  let at = run(r, 30, start, () => [vitals(58, 1020), motion(20)]);
  for (const stage of [1, 2, 3, 4] as const) {
    r.feed({ kind: "escalation", data: { at, stage, reason: "threshold" } }, at);
    at += 20_000;
  }
  at = run(r, 30, at, () => [vitals(58, 1020), motion(20)]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.counts.anomaly, 1, "four rungs, one climb");
  assert.equal(n.events.filter((e) => e.type === "anomaly").length, 1);
}

// --- but a second episode after a stand-down is a second one -------------
{
  const r = new NightRecorder(start);
  let at = run(r, 20, start, () => [vitals(58, 1020), motion(20)]);
  r.feed({ kind: "escalation", data: { at, stage: 1, reason: "threshold" } }, at);
  at += 20_000;
  r.feed({ kind: "escalation", data: { at, stage: 2, reason: "threshold" } }, at);
  at += 20_000;
  r.feed({ kind: "escalation", data: { at, stage: 0, reason: "none" } }, at);
  at = run(r, 20, at, () => [vitals(58, 1020), motion(20)]);
  r.feed({ kind: "escalation", data: { at, stage: 1, reason: "irregular" } }, at);
  at = run(r, 20, at, () => [vitals(58, 1020), motion(20)]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.counts.anomaly, 2, "the body answered, then it happened again");
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

// --- oxygen dips are §8.2's, not ours ------------------------------------
//
// The count comes from `screening.desaturations`, which already holds the
// 3% drop and the 10-second hold and has its own check file. A second
// implementation here would be a second answer to a settled question.
{
  const r = new NightRecorder(start);
  const ox = (spo2Pct: number): BleEvent => ({
    kind: "oxygen",
    data: { at: 0, spo2Pct, position: "supine" },
  });
  // Two hours at 97%, then a dip to 92% held for a full minute.
  let at = run(r, 120, start, (s) => [
    vitals(58, 1020),
    motion(20),
    ...(s % 20 === 0 ? [ox(97)] : []),
  ]);
  at = run(r, 1, at, (s) => [vitals(58, 1020), motion(20), ...(s % 20 === 0 ? [ox(92)] : [])]);
  at = run(r, 60, at, (s) => [
    vitals(58, 1020),
    motion(20),
    ...(s % 20 === 0 ? [ox(97)] : []),
  ]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.events.filter((e) => e.type === "desaturation").length, 1);
  assert.ok(n.breathing.desatPerHour > 0, "reported per hour of sleep, per §8.2");
  assert.equal(n.breathing.spo2DeltaPct, -5, "the dip against the night's own plateau");
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
  assert.equal(n.sleep.awake, 0, "a lost band is not a sleeper who was up all night");
  assert.equal(
    n.sleep.deep + n.sleep.light + n.sleep.rem + n.sleep.awake,
    10,
    "only the measured ten minutes are staged; the hour shows as the gap it was",
  );
}

// --- credit is not given for a room nobody watched -----------------------
//
// With no bedside in the room there are no lux samples, so darkness is zero
// minutes and pollution is zero minutes — and a contributor keyed off
// "pollution under fifteen minutes" reads that as a well-darkened room and
// awards the points. The score then rewards the absence of a sensor.
{
  const r = new NightRecorder(start);
  const at = run(r, 300, start, () => [vitals(58, 1030), motion(30)]);
  const n = r.finish(at, nightDate(start));

  assert.ok(
    !n.contributors.some((c) => c.key === "dark"),
    "no room samples, no darkness verdict",
  );
  assert.ok(n.score !== null, "the rest of the night still scores");
}

// --- §5.2: a short session is recorded, and never scored -----------------
//
// machine.ts has carried MIN_SCORED_SESSION_MS and its rule since before
// any of this existed, and nothing had ever called it. A ninety-minute nap
// scored like a night, and the guard I had written instead threw short
// sessions away entirely — the opposite of "recorded".
{
  const r = new NightRecorder(start);
  const at = run(r, 90, start, () => [vitals(58, 1030), motion(30)]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.score, null, "ninety minutes is not a night to score");
  assert.equal(n.sleep.durationMin, 90, "but it is recorded in full");
  assert.equal(n.heart.avg, 58, "and everything measured in it still counts");
  assert.deepEqual(n.contributors, [], "nothing to attribute a score that does not exist");
}

{
  const r = new NightRecorder(start);
  const at = run(r, 121, start, () => [vitals(58, 1030), motion(30)]);
  assert.ok(r.finish(at, nightDate(start)).score !== null, "just past two hours, and it scores");
}

// --- Doze freezes the clock, and the night must not fill the gap ---------
//
// Android suspends JavaScript timers once the screen has been off a while.
// That is not a hypothesis, it is the default, and it is the entire reason
// the foreground service exists. When it happens no events arrive and no
// tick fires, so the recorder simply sees a very long step.
//
// A staging window credits elapsed wall-clock time to one decision. Left
// unchecked, three hours in which nothing was measured are filed as three
// hours of deep sleep, backed by whatever handful of samples was still in
// the buffer — a fabricated measurement that looks entirely ordinary,
// which is the worst failure this product has.
{
  const r = new NightRecorder(start);
  let at = run(r, 10, start, () => [vitals(58, 1030), motion(30)]);
  // Three hours of frozen timers, then the phone wakes.
  at += 3 * 3600 * 1000;
  at = run(r, 10, at, () => [vitals(58, 1030), motion(30)]);
  const n = r.finish(at, nightDate(start));

  assert.equal(n.sleep.durationMin, 200, "the night really was that long");
  const staged = n.sleep.deep + n.sleep.light + n.sleep.rem + n.sleep.awake;
  assert.ok(
    staged <= 25,
    `only the measured minutes may be staged, got ${staged} of 200`,
  );
  assert.ok(n.sleep.deep < 30, "three unmeasured hours are not deep sleep");
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
