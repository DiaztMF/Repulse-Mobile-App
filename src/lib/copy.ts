/**
 * Regulated strings. Not one character may change, and they live here
 * so they are never retyped in a component — retyping is how wording
 * like this drifts without anyone noticing.
 */
export const COPY = {
  /** Required on Login, night detail, breathing, and settings. */
  disclaimer: "Bukan alat medis.",

  /** The words "apnea", "diagnosis", and "gangguan napas" must never
   *  appear on any screen. */
  breathingScreening:
    "Pola napas Anda selama tidur menunjukkan tanda yang sebaiknya diperiksakan ke dokter.",

  /** Sending always requires one human tap. Any wording implying
   *  automatic delivery is a false claim. */
  sosPending: "Pesan belum terkirim — perlu satu ketukan Anda.",

  /** Shown on every screen while the mock transport is active. */
  mockBadge: "DATA CONTOH",
} as const;

/** Metric names are locked. Renaming them breaks both consistency and,
 *  for the last three, regulatory wording. */
export const METRIC = {
  sleepScore: "Skor Tidur",
  restingPulse: "Nadi Istirahat",
  restlessness: "Kegelisahan",
  optimalDarkness: "Kegelapan Optimal",
  breathingScreening: "Skrining Napas",
  interventionScore: "Skor Intervensi",
} as const;
