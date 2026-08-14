/** Run: npm run check:ble
 *
 *  The mock is what the state machine, the escalation screens, and the
 *  demo on the 24th are all built against. If its ladder timings drift
 *  from `BLE_GATT_CONTRACT.md` §3.5, everything above it is being tested
 *  against fiction — and nobody would notice until the firmware arrived
 *  and disagreed.
 *
 *  Drives `step()` directly, so no timers and no waiting.
 */
import assert from "node:assert/strict";
import { MockTransport, type Scenario } from "./mock.ts";
import type { BleEvent } from "./transport.ts";

function run(scenario: Scenario, seconds: number) {
  const t = new MockTransport(scenario);
  const seen: BleEvent[] = [];
  t.on((e) => seen.push(e));
  for (let i = 0; i < seconds; i++) t.step();
  return seen;
}

const stages = (seen: BleEvent[]) =>
  seen.flatMap((e) => (e.kind === "escalation" ? [e.data.stage] : []));

// --- the ladder runs to SOS on the contract's own clock ------------------

const sos = run("anomaly-sos", 200);
assert.deepEqual(stages(sos), [1, 2, 3, 4], "every stage is reported, in order");

// §3.5: stage 1 at the anomaly, 2 at +20s, 3 at +35s, 4 at +65s. The
// anomaly is scripted for second 60, and `step()` emits after advancing.
const at = (stage: number) => {
  let n = 0;
  const t = new MockTransport("anomaly-sos");
  let found = 0;
  t.on((e) => {
    if (e.kind === "escalation" && e.data.stage === stage && !found) found = n;
  });
  for (n = 1; n <= 200; n++) t.step();
  return found;
};
assert.equal(at(1), 60, "stage 1 lands with the anomaly");
assert.equal(at(2), 80, "stage 2 is 20s later");
assert.equal(at(3), 95, "stage 3 is 35s after the anomaly");
assert.equal(at(4), 125, "stage 4 is 65s after the anomaly");

// --- a body that answers cancels it before the hard buzz -----------------

const recovers = run("anomaly-recovers", 200);
assert.deepEqual(stages(recovers), [1, 2, 0], "cancels at stage 2, and says so");
assert.ok(!stages(recovers).includes(3), "never reaches the stage that wakes the screen");
assert.ok(!stages(recovers).includes(4), "never sends an SOS");

// --- the dropout goes quiet, then hands over what it recorded ------------

const dropout = run("dropout-flush", 120);
const flush = dropout.filter((e) => e.kind === "buffered");
assert.equal(flush.length, 1, "exactly one flush, not a drip");
assert.ok(
  flush[0]!.kind === "buffered" && flush[0].events.length >= 39,
  "the band kept recording through the whole dropout",
);
const lost = dropout.findIndex((e) => e.kind === "link" && e.state === "lost");
const back = dropout.findIndex((e) => e.kind === "buffered");
const liveDuring = dropout
  .slice(lost, back)
  .filter((e) => e.kind === "vitals").length;
assert.equal(liveDuring, 0, "nothing live is emitted while the link is down");

// --- a normal night stays boring, which is the hardest thing to get right -

const normal = run("normal", 400);
assert.equal(stages(normal).length, 0, "no ladder without an anomaly");
const vitals = normal.flatMap((e) => (e.kind === "vitals" ? [e.data] : []));
assert.equal(vitals.length, 400, "one reading a second");
assert.ok(
  vitals.every((v) => v.worn && v.bpm > 45 && v.bpm < 80),
  "a sleeping wrist, worn, at a resting rate",
);
assert.ok(
  normal.some((e) => e.kind === "room") && normal.some((e) => e.kind === "oxygen"),
  "the room and the blood are both reported",
);

console.log("ok — ladder timings match GATT §3.5, and the dropout flushes once");
