/** Signal quality is reported 0-15 in the band status byte. */
export const GOOD = 10;
/** The reading must hold, not just touch — one spike is not stable
 *  contact, and a baseline recorded off a spike is worse than none. */
export const HOLD_MS = 3000;

/**
 * Kept pure so it can be checked without React's effect scheduling. The
 * first version of this gate was impossible to pass, and the bug lived
 * in the scheduling rather than in the rule — a rule that cannot be
 * tested on its own hides that.
 */
export function holdGate(
  quality: number,
  goodSince: number | null,
  now: number,
): { goodSince: number | null; stable: boolean } {
  if (quality < GOOD) return { goodSince: null, stable: false };
  const since = goodSince ?? now;
  return { goodSince: since, stable: now - since >= HOLD_MS };
}
