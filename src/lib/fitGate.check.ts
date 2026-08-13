/** Run: npm run check:gate
 *
 *  Calibration refuses to start until contact holds. A bad baseline makes
 *  every personal threshold wrong for a fortnight, so this rule is worth
 *  checking on its own rather than through the UI.
 */
import assert from "node:assert/strict";
import { holdGate } from "./fitGate.ts";

const t = 1_000_000;

// Below the threshold: never ready, and the clock stays reset.
assert.deepEqual(holdGate(4, null, t), { goodSince: null, stable: false });
assert.deepEqual(holdGate(9, t - 9000, t), { goodSince: null, stable: false });

// Reaching the threshold starts the clock but does not open the gate.
assert.deepEqual(holdGate(11, null, t), { goodSince: t, stable: false });

// Still short of the hold.
assert.equal(holdGate(11, t - 2999, t).stable, false);

// Held long enough.
assert.equal(holdGate(11, t - 3000, t).stable, true);
assert.equal(holdGate(14, t - 8000, t).stable, true);

// A dip mid-hold restarts it — one spike is not stable contact.
const dipped = holdGate(6, t - 2000, t);
assert.equal(dipped.goodSince, null);
assert.equal(holdGate(12, dipped.goodSince, t + 100).stable, false);

// Feeding it a steady stream the way the interval does must open the gate,
// which is exactly what the first version could never do.
let since: number | null = null;
let stable = false;
for (let ms = 0; ms <= 6000; ms += 250) {
  const q = ms < 2000 ? 4 : 12;
  ({ goodSince: since, stable } = holdGate(q, since, t + ms));
}
assert.equal(stable, true, "steady contact eventually opens the gate");

console.log("ok — gate opens only after contact holds, and resets on a dip");
