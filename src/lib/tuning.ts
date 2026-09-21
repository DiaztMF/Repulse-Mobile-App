/**
 * Ambang yang dipakai gelang untuk memutuskan "ada yang tidak beres".
 *
 * Nilainya dulu dicetak sebagai teks mati di layar Settings dengan catatan
 * "menyusul bersama firmware link". Link-nya sudah lama ada: firmware
 * mem-parse setiap kunci di bawah ini dari karakteristik config, dan
 * `encodeBandConfig` mengirimnya sebagai JSON polos. Yang tidak ada hanya
 * cara mengubahnya.
 *
 * Ini penting bukan karena kerapian. Default-nya milik orang lain — 62 bpm
 * ± 16 adalah tebakan di meja kerja — dan satu malam penuh alarm palsu
 * tidak bisa menunggu rilis berikutnya untuk diperbaiki.
 *
 * Denyut istirahat sendiri TIDAK di sini; ia punya rumahnya di baseline.ts
 * karena kalibrasi dan akun sudah menulis ke sana.
 */
const KEY = "repulse.tuning";

export type Tuning = {
  hr_threshold_delta: number;
  rr_variability_threshold: number;
  stage1_s: number;
  stage2_s: number;
  stage3_s: number;
};

/** Sama persis dengan yang ada di repulse_band.ino dan ladder.h. Kalau
 *  firmware berubah, dua angka ini harus ikut. */
export const DEFAULTS: Tuning = {
  hr_threshold_delta: 16,
  rr_variability_threshold: 0.18,
  stage1_s: 20,
  stage2_s: 15,
  stage3_s: 30,
};

/** Batas yang ditolak firmware atau yang tidak masuk akal secara klinis.
 *  Ambang 1 bpm membuat setiap detak jadi anomali; 300 detik diam di
 *  stage 1 membuat tangga itu tidak ada gunanya. */
export const LIMITS: Record<keyof Tuning, { min: number; max: number; step: number }> = {
  hr_threshold_delta: { min: 5, max: 40, step: 1 },
  rr_variability_threshold: { min: 0.05, max: 0.4, step: 0.01 },
  stage1_s: { min: 5, max: 60, step: 5 },
  stage2_s: { min: 5, max: 60, step: 5 },
  stage3_s: { min: 5, max: 120, step: 5 },
};

export function clampTuning(k: keyof Tuning, v: number): number {
  const { min, max } = LIMITS[k];
  if (!Number.isFinite(v)) return DEFAULTS[k];
  // Pembulatan dua desimal: variability naik per 0.01 dan float biner
  // meninggalkan 0.18000000000000002 yang lalu tersimpan apa adanya.
  return Math.round(Math.min(max, Math.max(min, v)) * 100) / 100;
}

export function readTuning(): Tuning {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const saved = JSON.parse(raw) as Partial<Tuning>;
    const out = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS) as (keyof Tuning)[]) {
      if (typeof saved[k] === "number") out[k] = clampTuning(k, saved[k]);
    }
    return out;
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeTuning(t: Tuning) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    // Gelang sudah menerima nilainya lewat configure(); yang hilang cuma
    // ingatan setelah aplikasi ditutup.
  }
}
