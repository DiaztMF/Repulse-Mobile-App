/**
 * Regulated strings. Not one character may change, and they live here
 * so they are never retyped in a component — retyping is how wording
 * like this drifts without anyone noticing.
 */
export const COPY = {
  /** Required on sign-in, night detail, breathing, and settings. */
  disclaimer: "Not a medical device.",

  /** The words "apnea", "diagnosis", and "disorder" must never appear
   *  on any screen. This sentence reports a sign, never a condition. */
  breathingScreening:
    "Your breathing pattern during sleep shows a sign worth having checked by a doctor.",

  /** Sending always requires one human tap. Any wording implying
   *  automatic delivery is a false claim. */
  sosPending: "Message not sent yet. It needs one tap from you.",

  /** Shown on every screen while the mock transport is active. */
  mockBadge: "SAMPLE DATA",
} as const;

/** Metric names are locked. Renaming them breaks both consistency and,
 *  for the last three, regulatory wording. */
export const METRIC = {
  sleepScore: "Sleep Score",
  restingPulse: "Resting Pulse",
  restlessness: "Restlessness",
  optimalDarkness: "Optimal Darkness",
  breathingScreening: "Breathing Screening",
  interventionScore: "Intervention Score",
} as const;
