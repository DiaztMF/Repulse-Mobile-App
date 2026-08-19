/** Run: npm run check:screening
 *
 *  PRD §14 lists breathing screening among the things that may not be cut
 *  under any circumstance, and §12 binds the sentence it produces word for
 *  word. A screening that fires when it should not sends someone to a
 *  doctor for nothing; one that stays quiet when it should not is worse.
 *
 *  So the thresholds are checked here rather than trusted: a 3% drop held
 *  for 10 seconds, counted per hour of sleep, and a flag that needs all
 *  three signals at once.
 */
import assert from "node:assert/strict";
import {
  DARK_OPTIMAL_LUX,
  darkness,
  desatPerHour,
  desaturations,
  screeningFlag,
  sleepingBaseline,
  restingFrom,
  stageOf,
  worstPosition,
} from "./screening.ts";
import type { Motion, Oxygen, Room, Vitals } from "../ble/transport.ts";

const T = 1_700_000_000_000;
const ox = (offsetS: number, pct: number, position: Oxygen["position"] = "supine"): Oxygen => ({
  at: T + offsetS * 1000,
  spo2Pct: pct,
  position,
});

// --- §8.2 desaturation ---------------------------------------------------

// Baseline 96. A dip to 93 is exactly 3% and counts; 94 does not.
const held = desaturations([ox(0, 96), ox(20, 93), ox(40, 92), ox(60, 96)], 96);
assert.equal(held.length, 1, "one event, not one per sample");
assert.equal(held[0]!.lowest, 92, "the deepest point is kept, not the first");

assert.equal(
  desaturations([ox(0, 96), ox(20, 94), ox(40, 96)], 96).length,
  0,
  "a 2% dip is not an event",
);

// Held long enough is the whole point — one bad sample is not an event.
assert.equal(
  desaturations([ox(0, 96), ox(5, 92), ox(9, 96)], 96).length,
  0,
  "under 10 seconds does not count",
);
assert.equal(desaturations([ox(0, 96), ox(5, 92), ox(15, 96)], 96).length, 1);

// 0 means the reading was invalid. Treating it as a desaturation would
// turn a finger that moved into a breathing event.
assert.equal(
  desaturations([ox(0, 96), ox(20, 0), ox(40, 0), ox(60, 96)], 96).length,
  0,
  "invalid samples are skipped, never read as a drop to zero",
);

// §8.2 counts per hour of sleep. Four events in eight hours is not the
// same finding as four in two.
assert.equal(desatPerHour(held, 8 * 3_600_000), 0.1);
assert.equal(desatPerHour([...held, ...held, ...held, ...held], 2 * 3_600_000), 2);

// §3.2 forbids merging left and right — the weekly summary has to name the
// position, and that report cannot be written without the split.
const positioned = desaturations(
  [ox(0, 96), ox(20, 92, "supine"), ox(40, 96), ox(60, 92, "supine"), ox(80, 96), ox(100, 92, "left"), ox(120, 96)],
  96,
);
assert.equal(worstPosition(positioned), "supine");
assert.equal(worstPosition([]), null);

// --- the flag, which is the consequential one ----------------------------

const enough = { desatPerHour: 6, snoreMinutes: 90, sleepMinutes: 400 };
assert.equal(screeningFlag(enough), true, "all three signals, and enough sleep");

assert.equal(
  screeningFlag({ ...enough, desatPerHour: 4 }),
  false,
  "snoring alone is a person who snores",
);
assert.equal(
  screeningFlag({ ...enough, snoreMinutes: 5 }),
  false,
  "desaturation alone is not the finding either",
);
assert.equal(
  screeningFlag({ desatPerHour: 9, snoreMinutes: 60, sleepMinutes: 90 }),
  false,
  "a 90-minute nap is not screened, however bad it looks",
);

// --- §8.3 darkness -------------------------------------------------------

const room = (min: number, lux: number): Room => ({
  at: T + min * 60_000,
  tempC: 27,
  humidityPct: 70,
  lux,
  db: 40,
});

const d = darkness([room(0, 0.4), room(30, 0.4), room(60, 12), room(90, 1)]);
assert.equal(d.darkOptimalMin, 60, "two half-hours below 3 lux");
assert.equal(d.pollutionMin, 30, "the half-hour above 5 lux is pollution");
// The band between 3 and 5 is neither, and must not be quietly counted as
// dark — that is the number the darkness claim rests on.
assert.deepEqual(darkness([room(0, 4), room(30, 4)]), {
  darkOptimalMin: 0,
  pollutionMin: 0,
});
assert.equal(DARK_OPTIMAL_LUX, 3);

// --- §8.1 staging --------------------------------------------------------

const motion = (mg: number, n = 10): Motion[] =>
  Array.from({ length: n }, (_, i) => ({ at: T + i * 1000, levelMg: mg }));
const beats = (rrs: number[]): Vitals[] =>
  rrs.map((rrMs, i) => ({ at: T + i * 1000, bpm: Math.round(60000 / rrMs), rrMs, worn: true, signalQuality: 12 }));

const steady = beats([960, 962, 958, 961, 959, 960]);
assert.equal(stageOf(motion(400), steady), "awake", "a moving body is awake");
assert.equal(stageOf(motion(40), steady), "deep", "still, and a metronome heart");
assert.equal(
  stageOf(motion(40), beats([900, 1050, 880, 1100, 920, 1080])),
  "rem",
  "still, but a heart all over the place",
);
// §8.1's actual instruction: movement alone must not decide it. Same
// stillness, different hearts, different answers — which is the proof.
assert.notEqual(stageOf(motion(40), steady), stageOf(motion(40), beats([900, 1050, 880, 1100, 920, 1080])));

// --- §8.1 baseline -------------------------------------------------------

assert.equal(sleepingBaseline([]), null, "no history, no baseline");
assert.equal(sleepingBaseline([60, 62, 64]), 62);
// Only the last seven, so a baseline from a month ago stops counting.
assert.equal(sleepingBaseline([100, 60, 60, 60, 60, 60, 60, 60]), 60);

// --- the resting figure calibration records ------------------------------
//
// §3.1 measures every personal threshold for the next fortnight against
// this one number, so both of its failure directions matter.
assert.equal(restingFrom([]), null, "no samples is not a baseline");
assert.equal(restingFrom([60, 61, 62]), null, "and neither are three beats");

// A percentile, not a minimum: PPG throws impossible readings, and one of
// them must not become the figure every alarm is hung off.
const steadyish = [...Array(40).fill(60), 22];
assert.equal(restingFrom(steadyish), 60, "one artefact does not set the baseline");

// It is the low plateau, though — not the average.
const drifting = [...Array(20).fill(58), ...Array(20).fill(74)];
assert.equal(restingFrom(drifting), 58);

console.log("ok — screening needs all three signals, and 3% must hold for 10s");
