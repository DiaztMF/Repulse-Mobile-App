/** Run: npm run check:tuning
 *
 *  Setiap angka di sini dikirim ke gelang dan dipakai memutuskan apakah
 *  malam seseorang layak dibangunkan. Nilai rusak yang lolos ke localStorage
 *  bertahan sampai data dihapus — ambang 0 bpm membuat setiap detak jadi
 *  anomali, dan tidak ada layar yang akan memberi tahu kenapa.
 */
import assert from "node:assert/strict";
import { clampTuning, DEFAULTS, LIMITS, readTuning, type Tuning } from "./tuning.ts";

// Tanpa localStorage, node akan melempar; readTuning harus tetap menjawab.
assert.deepEqual(readTuning(), DEFAULTS, "no storage falls back to firmware defaults");

// Setiap default harus berada di dalam batasnya sendiri, atau UI akan
// membuka dengan nilai yang tombolnya menolak.
for (const k of Object.keys(DEFAULTS) as (keyof Tuning)[]) {
  const { min, max } = LIMITS[k];
  assert.ok(DEFAULTS[k] >= min && DEFAULTS[k] <= max, `${k} default inside its own limits`);
}

assert.equal(clampTuning("hr_threshold_delta", 0), 5, "below floor clamps up");
assert.equal(clampTuning("hr_threshold_delta", 999), 40, "above ceiling clamps down");
assert.equal(clampTuning("hr_threshold_delta", NaN), 16, "unparseable falls back");

// 0.17 + 0.01 di float biner adalah 0.18000000000000002. Tanpa pembulatan
// angka itu tersimpan apa adanya dan muncul di layar sebagai 0.18000000000000002.
assert.equal(clampTuning("rr_variability_threshold", 0.17 + 0.01), 0.18, "two decimals");

console.log("tuning ok");
