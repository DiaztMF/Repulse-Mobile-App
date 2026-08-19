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
  "/onboarding/contacts",
  "/ready",
] as const;

/** Written when O10 is dismissed. Anything not in STEPS means finished. */
export const FINISHED = "done";

const ref = (uid: string) => doc(db!, "users", uid);

/**
 * Four states, because the callers want different things from each: the
 * splash should not drag an existing user into setup, while a fresh sign-in
 * has nowhere else to send them.
 *
 * `unknown` is the one that had to be added. It used to be reported as
 * `done`, which meant a failed read — denied Firestore rules, no database,
 * no signal — told a brand-new account that setup was already finished. It
 * went straight to the dashboard having granted no permissions at all, so
 * the foreground service could never start and the first night failed in
 * silence. "I could not find out" is not the same answer as "there is
 * nothing left to do", and only the caller knows which way to lean.
 */
export type Progress =
  | { at: "start" }
  | { at: "step"; route: string }
  | { at: "done" }
  | { at: "unknown" };

/**
 * Never throws. A reader that fails must not strand anyone at the door —
 * but it says so now instead of claiming success.
 */
export async function readProgress(uid: string): Promise<Progress> {
  if (!db) return { at: "done" };
  try {
    const snap = await getDoc(ref(uid));
    const at = snap.data()?.onboarding as string | undefined;
    if (!at) return { at: "start" };
    if (at === FINISHED) return { at: "done" };
    return {
      at: "step",
      route: STEPS.includes(at as (typeof STEPS)[number]) ? at : STEPS[0],
    };
  } catch (e) {
    // Logged because this used to be silent, and a silent failure here is
    // indistinguishable from a finished account. It is the difference
    // between a rules problem and a working install, and it costs one line
    // of logcat to tell them apart.
    console.error("[onboarding] progress unreadable", e);
    return { at: "unknown" };
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
