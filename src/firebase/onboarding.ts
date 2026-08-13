import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./app";

/**
 * Onboarding in order. Position in this list is the whole progress model:
 * the furthest route reached is the one to resume at.
 *
 * Recorded by the layout route in routes.tsx rather than by each screen,
 * so a new step between two others needs one line here and nothing else.
 */
export const STEPS = [
  "/permissions",
  "/permissions/autostart",
  "/setup-guide",
  "/pair/band",
  "/pair/bedside",
  "/calibration",
  "/contacts",
  "/ready",
] as const;

/** Written when O10 is dismissed. Anything not in STEPS means finished. */
export const FINISHED = "done";

const ref = (uid: string) => doc(db!, "users", uid);

/**
 * The route to send a returning user to, or null to leave them alone.
 *
 * Errors resolve to null rather than throwing: a reader that fails must
 * not strand anyone on the splash, and being sent to the app you already
 * finished is a smaller harm than not getting in at all.
 */
export async function resumeAt(uid: string): Promise<string | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(ref(uid));
    const at = snap.data()?.onboarding as string | undefined;
    if (!at || at === FINISHED) return null;
    return STEPS.includes(at as (typeof STEPS)[number]) ? at : STEPS[0];
  } catch {
    return null;
  }
}

/**
 * Never moves backwards. Walking back to change a contact must not undo
 * the fact that pairing is already done.
 */
export async function reached(uid: string, route: string) {
  if (!db) return;
  const next = STEPS.indexOf(route as (typeof STEPS)[number]);
  if (next < 0) return;

  try {
    const snap = await getDoc(ref(uid));
    const at = snap.data()?.onboarding as string | undefined;
    if (at === FINISHED) return;
    if (at && STEPS.indexOf(at as (typeof STEPS)[number]) >= next) return;
    await setDoc(ref(uid), { onboarding: route }, { merge: true });
  } catch {
    // Progress is a convenience. Losing it costs a few taps; blocking
    // onboarding on a failed write costs the whole session.
  }
}

export async function finish(uid: string) {
  if (!db) return;
  try {
    await setDoc(ref(uid), { onboarding: FINISHED }, { merge: true });
  } catch {
    // As above.
  }
}
