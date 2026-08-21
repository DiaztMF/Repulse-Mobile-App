/** Run: npm run check:machine
 *
 *  PRD §4.3 names one test as mandatory: trigger an anomaly while the
 *  sunrise sequence is running, and the sunrise must be cancelled. It is
 *  written here rather than driven through the UI, because a rule that can
 *  only be checked by clicking is a rule that stops being checked.
 *
 *  Rule 3 is here too. Reverse polarity is the claim this product would be
 *  most embarrassed to get wrong: our own white noise masking the sound of
 *  someone in trouble.
 */
import assert from "node:assert/strict";
import {
  CHECK_WINDOW_MS,
  actuatorsFor,
  chooseIntervention,
  initial,
  reduce,
  type Machine,
  type Input,
} from "./machine.ts";

const T = 1_700_000_000_000;
const room = { temp_c: 29.1, rh: 74, lux: 0.4, db: 48 };

const drive = (m: Machine, ...inputs: Input[]) => inputs.reduce(reduce, m);

// --- §4.3, the mandatory one ---------------------------------------------

const sunrise = drive(
  initial,
  { t: "start-sleep", at: T },
  { t: "wake-window", at: T + 1000 },
);
assert.equal(sunrise.phase, "WAKE_WINDOW", "the sunrise is running");

const interrupted = reduce(sunrise, { t: "stage", at: T + 2000, stage: 1 });
assert.equal(interrupted.phase, "ALERT", "an anomaly cancels the sunrise");
assert.equal(interrupted.resume, "WAKE_WINDOW", "and remembers what it cancelled");

// A body that answers puts the sunrise back, and calls nobody.
const answered = reduce(interrupted, { t: "stage", at: T + 20_000, stage: 0 });
assert.equal(answered.phase, "WAKE_WINDOW", "stands down to where it was");
assert.equal(answered.stage, 0);

// --- Rule 2: nothing outranks the ladder ---------------------------------

for (const start of ["STANDBY", "WIND_DOWN", "MONITORING", "COMFORT", "WAKE_WINDOW"] as const) {
  const m = reduce({ ...initial, phase: start }, { t: "stage", at: T, stage: 2 });
  assert.equal(m.phase, "ALERT", `ALERT interrupts ${start}`);
}
// ...and nothing outranks ALERT either.
const busy = reduce({ ...initial, phase: "ALERT" }, { t: "wake-window", at: T });
assert.equal(busy.phase, "ALERT", "the wake window cannot preempt an alert");

const sos = reduce({ ...initial, phase: "ALERT" }, { t: "stage", at: T, stage: 4 });
assert.equal(sos.phase, "SOS_SENT", "stage 4 is SOS_SENT");

// SOS_SENT used to be a phase nothing could leave, so "I am okay" left the
// screen without leaving the phase and the router put it straight back.
const okay = reduce({ ...sos, resume: "MONITORING" }, { t: "stage", at: T + 60_000, stage: 0 });
assert.equal(okay.phase, "MONITORING", "SOS_SENT stands down too");
assert.equal(okay.stage, 0);

// --- Rule 3: reverse polarity --------------------------------------------

const emergency = actuatorsFor("SOS_SENT");
assert.ok(
  emergency.some((a) => a.kind === "siren" && a.on),
  "the siren sounds",
);
assert.ok(
  emergency.some((a) => a.kind === "noise" && a.level === 3),
  "white noise goes to maximum as a siren, not to zero",
);
assert.ok(
  emergency.some((a) => a.kind === "aroma" && a.seconds === 0),
  "aroma stays off in an emergency",
);
assert.ok(
  emergency.some((a) => a.kind === "light" && a.mode === "white-flash"),
  "the light does the opposite of settling anyone",
);

// The COMFORT row that reads like a typo and is not.
assert.ok(
  actuatorsFor("COMFORT").some((a) => a.kind === "light" && a.mode === "off"),
  "the light stays off during COMFORT — any light suppresses melatonin",
);

// §5.3 caps aroma at 20-30s per event.
// The sleeper picks the comfort volume; the emergency row does not care
// what they picked. A preference that could quieten an ALERT would be a
// setting nobody remembers making, silencing the one thing meant to wake
// a household.
const quiet = actuatorsFor("COMFORT", 1).find((x) => x.kind === "noise");
assert.equal(quiet && quiet.kind === "noise" && quiet.level, 1, "comfort follows the preference");
const loud = actuatorsFor("SOS_SENT", 1).find((x) => x.kind === "noise");
assert.equal(loud && loud.kind === "noise" && loud.level, 3, "SOS stays at full volume");

const aroma = actuatorsFor("COMFORT").find((a) => a.kind === "aroma");
assert.ok(aroma && aroma.kind === "aroma" && aroma.seconds > 0 && aroma.seconds <= 30);

// --- §7.1: exactly one row per COMFORT event -----------------------------

const restless: Input = {
  t: "restless",
  at: T,
  movementG: 0.42,
  hr: 78,
  baselineHr: 62,
  room,
};

const settled = drive(
  { ...initial, phase: "MONITORING" },
  restless,
  { t: "chose", intervention: "white_noise", volume: 3, track: 2 },
  { t: "settled", at: T + 244_000 },
);
assert.equal(settled.phase, "MONITORING", "back to monitoring");
assert.equal(settled.rows.length, 1, "exactly one row");
assert.equal(settled.rows[0]!.result, "berhasil");
assert.equal(settled.rows[0]!.settle_time_s, 244);
assert.equal(settled.rows[0]!.trigger.hr, 78);
// §7.1 wants the intervention on the row, or the counter it feeds has no
// idea which one to credit.
assert.deepEqual(settled.rows[0]!.intervention, {
  type: "white_noise",
  volume: 3,
  track: 2,
});

// A choice only lands while a check window is open.
assert.equal(
  reduce({ ...initial, phase: "MONITORING" }, { t: "chose", intervention: "aroma" }).comfort,
  null,
);

// A failure retries once, then gives up — and still writes one row.
let failing = drive({ ...initial, phase: "MONITORING" }, restless);
failing = reduce(failing, { t: "tick", at: T + CHECK_WINDOW_MS });
assert.equal(failing.phase, "COMFORT", "one more intervention is allowed");
assert.equal(failing.comfort?.retried, true);
failing = reduce(failing, { t: "tick", at: T + CHECK_WINDOW_MS * 2 });
assert.equal(failing.phase, "MONITORING");
assert.equal(failing.rows.length, 1, "still exactly one row, not two");
assert.equal(failing.rows[0]!.result, "gagal");

// §5.3: no bedside means no intervention, so it is not a failed one.
const noBedside = drive(
  { ...initial, phase: "MONITORING", bedsideOnline: false },
  restless,
  { t: "tick", at: T + CHECK_WINDOW_MS },
);
assert.equal(noBedside.rows.length, 1, "the restless event is still recorded");
assert.equal(noBedside.rows[0]!.result, null, "but it is not scored as a failure");
assert.equal(noBedside.rows[0]!.bedside_offline, true);

// --- §7.2: the counter ---------------------------------------------------

const never = () => false;
const always = () => true;

// Under three attempts, nothing is eligible — fall back to the default order.
assert.equal(
  chooseIntervention(
    { white_noise: { tried: 2, worked: 2 }, aroma: { tried: 0, worked: 0 }, light: { tried: 0, worked: 0 } },
    never,
  ),
  "white_noise",
);

const scores = {
  white_noise: { tried: 10, worked: 8 },
  aroma: { tried: 10, worked: 3 },
  light: { tried: 0, worked: 0 },
};
assert.equal(chooseIntervention(scores, never), "white_noise", "0.80 beats 0.30");
assert.equal(chooseIntervention(scores, always), "aroma", "one in five explores");

console.log("ok — an anomaly cancels the sunrise, and every actuator reverses");
