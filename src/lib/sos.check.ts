/** Run: npm run check:sos
 *
 *  The emergency message is the one piece of text this app produces that a
 *  stranger acts on at three in the morning. A wrong number sends it
 *  nowhere and reports success; wrong wording breaks §12.
 */
import assert from "node:assert/strict";
import { FIX_STALE_MS, mapsUrl, messageBody, smsUrl, waNumber, whatsappUrl } from "./sos.ts";

// --- the number ----------------------------------------------------------
//
// 08xx and +628xx are the same Indonesian number written two ways, and the
// form people actually type is the first one. wa.me accepts neither the
// leading zero nor the plus.

assert.equal(waNumber("0812 3456 7890"), "6281234567890");
assert.equal(waNumber("081234567890"), "6281234567890");
assert.equal(waNumber("+62 812-3456-7890"), "6281234567890");
assert.equal(waNumber("62812 3456 7890"), "6281234567890");
// Already-clean input must survive untouched rather than gain a second 62.
assert.equal(waNumber("6281234567890"), "6281234567890");

// --- the body ------------------------------------------------------------

const at = new Date("2026-08-14T02:16:00Z").getTime();
const position = { lat: -6.914744, lon: 107.60981, accuracyM: 12, at };

const full = messageBody({ owner: "Andi", at, position, bpm: 132 });
assert.ok(full.startsWith("Andi may need help."), "who, first");
assert.ok(full.includes("Detected at"), "and when");
// To the second, and with dots: "02.16" and "02.16.43" answer different
// questions about how long somebody has been down.
assert.ok(/Detected at \d{2}\.\d{2}\.\d{2}\./.test(full), "hh.mm.ss, dots not colons");
assert.ok(!full.includes(":") || full.includes("https://"), "no colon outside the link");
assert.ok(full.includes("maps.google.com"), "and where");
assert.ok(full.includes("132 bpm"));
// Precision is part of the ask: the contact gets coordinates and how far off
// they may be, not a neighbourhood.
assert.ok(full.includes("-6.914744,107.609810"), "actual coordinates, six decimals");
assert.ok(full.includes("(12 m)"), "and how precise they are");

// A fix from before the incident is still worth sending, but it has to be
// labelled or it sends someone to where the person used to be.
const stale = messageBody({
  owner: "Andi",
  at,
  position: { ...position, at: at - FIX_STALE_MS - 60_000 },
});
assert.ok(stale.includes("Last seen at"), "an old pin says it is old");
assert.ok(stale.includes("maps.google.com"), "and still carries the link");
// §12: the disclaimer travels with the message, because this is the text
// most likely to be forwarded to a doctor.
assert.ok(full.includes("Not a medical device."));

// §12's banned vocabulary must not appear in the one message a stranger
// reads and acts on.
for (const word of ["apnea", "diagnosis", "disorder", "sent automatically", "automatically sent"]) {
  assert.ok(!full.toLowerCase().includes(word), `"${word}" must never appear`);
}

// A refused location is not a reason to stay silent — it changes the ask.
const noFix = messageBody({ owner: "Andi", at, position: null });
assert.ok(noFix.includes("please call"), "without a map, ask for a call");
assert.ok(!noFix.includes("maps.google.com"));
assert.ok(!noFix.includes("undefined") && !noFix.includes("NaN"));

// --- the links -----------------------------------------------------------

const contact = { name: "Sari", phone: "0812 3456 7890", relation: "Parent" };
const wa = whatsappUrl(contact, full);
assert.ok(wa.startsWith("https://wa.me/6281234567890?text="), "recipient and text prefilled");
// Newlines and the URL inside the body have to survive encoding, or the
// message arrives truncated at the first special character.
assert.ok(wa.includes("%0A"), "line breaks encoded");
assert.ok(decodeURIComponent(wa.split("?text=")[1]!) === full, "round-trips exactly");

assert.ok(smsUrl(contact, full).startsWith("sms:6281234567890?body="));

assert.equal(mapsUrl(position), "https://maps.google.com/?q=-6.914744,107.609810");

console.log("ok — 08xx becomes 628xx, and the message survives encoding intact");
