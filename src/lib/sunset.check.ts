/** Run: npm run check:sunset
 *
 *  The colour wheel stores a hex and draws its dot back from it, and the
 *  lamp is sent that same hex. If the two conversions disagree, the dot sits
 *  somewhere other than the colour the bedside is showing.
 */
import assert from "node:assert/strict";
import { DEFAULT_SUNSET, hexToHs, hexToRgb, hsToHex } from "./sunset.ts";

// The wheel's edge at the three primaries, and its white centre.
assert.equal(hsToHex(0, 1), "#ff0000");
assert.equal(hsToHex(120, 1), "#00ff00");
assert.equal(hsToHex(240, 1), "#0000ff");
assert.equal(hsToHex(200, 0), "#ffffff", "the centre is white whatever the angle");

// A tap, and the dot drawn back from it, land on the same colour.
for (const hex of [DEFAULT_SUNSET.color, "#ff0000", "#40e0ff", "#b000ff"]) {
  const { h, s } = hexToHs(hex);
  assert.equal(hsToHex(h, s), hex, `${hex} survives the round trip`);
}

// The untouched default is still the amber the firmware always drew.
assert.deepEqual(hexToRgb(DEFAULT_SUNSET.color), [255, 146, 5]);

console.log("ok — the wheel, its dot and the lamp agree on every colour");
