/** Run: npm run check:data
 *
 *  Guards the invariants the screens rely on. If one of these breaks, a
 *  screen shows a wrong number rather than an error, which is the
 *  failure mode worth catching early.
 */
import assert from "node:assert/strict";
import { NIGHTS, INTERVENTIONS, seriesFor, nightByDate } from "./mock.ts";
import { screeningFlag } from "../lib/screening.ts";

assert.equal(NIGHTS.length, 14, "fortnight");

const dates = NIGHTS.map((n) => n.date);
assert.equal(new Set(dates).size, 14, "dates unique");
assert.deepEqual(dates, [...dates].sort().reverse(), "newest first");

// Determinism: screenshots and rehearsed demos depend on this.
assert.deepEqual(seriesFor(dates[1]!), seriesFor(dates[1]!), "series stable");
assert.equal(NIGHTS[0]!.score, nightByDate(dates[0]!)!.score, "lookup matches");

// Demo states that must stay reachable.
assert.equal(NIGHTS[3]!.score, null, "one night without the band");
assert.ok(NIGHTS[6]!.counts.offlineMin > 0, "one night partly offline");
assert.ok(
  NIGHTS.some((n) => n.breathing.desatPerHour >= 1),
  "breathing trend has signal",
);

// Series length tracks the summary rather than drifting from it.
for (const n of NIGHTS) {
  assert.equal(seriesFor(n.date).length, n.sleep.durationMin, `series ${n.date}`);
}

// Sleep stages must add up, or the hypnogram lies.
for (const n of NIGHTS) {
  const { deep, light, rem, awake, durationMin } = n.sleep;
  assert.equal(deep + light + rem + awake, durationMin, `stages ${n.date}`);
}

// Intervention totals are aggregated, not invented.
const comfort = NIGHTS.flatMap((n) =>
  n.events.filter((e) => e.type === "comfort" && e.intervention),
);
assert.equal(
  INTERVENTIONS.reduce((a, i) => a + i.tries, 0),
  comfort.length,
  "tries match events",
);
assert.equal(
  INTERVENTIONS.reduce((a, i) => a + i.success, 0),
  comfort.filter((e) => e.settleSec != null).length,
  "successes match settled events",
);
for (const i of INTERVENTIONS) {
  assert.ok(i.success <= i.tries, `${i.key} success <= tries`);
}

// §8.2's screening sentence has to fire on the synthetic fortnight, and
// fire for the real reason. The rule wants three signals at once, so a
// generator tweak that quietly drops one would take the demo's most
// consequential screen silent without failing anything else.
{
  const flagged = NIGHTS.filter((n) =>
    screeningFlag({
      desatPerHour: n.breathing.desatPerHour,
      snoreMinutes: n.breathing.snoreMin,
      sleepMinutes: n.sleep.durationMin - n.sleep.awake,
    }),
  );
  assert.equal(flagged.length, 2, "two nights clear §8.2, which is what makes it a pattern");
  assert.ok(
    flagged.every((n) => n.breathing.desatPerHour >= 5),
    "and they clear it on the dips, not by accident",
  );
}

console.log(
  `ok — 14 nights, ${comfort.length} comfort events, ${INTERVENTIONS.filter((i) => i.tries >= 3).length}/4 interventions past the 3-try minimum`,
);
