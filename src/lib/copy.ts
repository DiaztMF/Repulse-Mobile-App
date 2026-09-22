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

  /** The message now leaves by itself, by SMS, because during the
   *  emergency this screen exists for nobody is free to find a Send
   *  button. The wording therefore promises a send and offers the way
   *  out, and must never promise a send that has already happened. */
  sosPending: "Going out to your emergency contacts. Stop it below if you are okay.",

  /** The browser build. No web API sends an SMS, so the send genuinely
   *  does need a person, and the screen has to say which of the two it
   *  is rather than showing the phone's wording everywhere. */
  sosManual: "A browser cannot send this by itself. It needs one tap from you.",

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
