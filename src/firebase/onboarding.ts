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

/**
 * Onboarding is finished *per device*, and this is the half that knows it.
 *
 * Everything setup produces lives on the phone: the Android permission
 * grants, the battery-optimisation exemption, and the emergency contacts,
 * which `lib/sos.ts` keeps in localStorage. Uninstalling wipes all three
 * while Firestore goes on saying the account is finished — so an account
 * marked done, opened on a new phone, was waved past the one screen that
 * grants the permissions the night depends on and past the screen that
 * saves the number the SOS message is sent to. It reached the dashboard
 * with no permissions and nobody to call, and said nothing.
 *
 * localStorage is the right home precisely because uninstalling clears it.
 * The Firestore record still answers "how far did this account get", which
 * is what resuming needs; this answers "is this phone set up", which is
 * what letting someone in needs.
 */
const DEVICE_KEY = "repulse.onboarded";

export const onboardedHere = () => {
  try {
    return localStorage.getItem(DEVICE_KEY) === "1";
  } catch {
    // Private mode, or a WebView with storage disabled. Treating that as
    // "not set up" costs a walk through setup; treating it as set up costs
    // the permissions.
    return false;
  }
};

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
 * How long this read gets before it is treated as unanswerable.
 *
 * `getDoc` has no deadline of its own, and a hang is not an error — the
 * promise simply never settles, so no `catch` runs and no `finally` does
 * either. The sign-in screen awaited this before navigating, which is how
 * a Google sign-in that had already *succeeded* left somebody watching a
 * spinner with no end: the session was live, `onAuthStateChanged` had
 * fired, and the only thing still waiting was a document read. Backing out
 * and reopening the app "fixed" it because the guard could see the session
 * the screen was still blocked on.
 *
 * The splash had its own two-second cap for exactly this read. Putting the
 * deadline here means every caller gets it, including the next one.
 */
const READ_TIMEOUT_MS = 4000;

/**
 * Never throws, and always settles. A reader that fails must not strand
 * anyone at the door — but it says so now instead of claiming success.
 */
export async function readProgress(uid: string): Promise<Progress> {
  if (!db) return { at: "done" };
  try {
    const snap = await Promise.race([
      getDoc(ref(uid)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("progress read timed out")), READ_TIMEOUT_MS),
      ),
    ]);
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
  // First, and outside the Firestore guard: this is the record that
  // decides whether this phone is set up, and it has to be written even
  // when there is no project to write the other one to.
  try {
    localStorage.setItem(DEVICE_KEY, "1");
  } catch {
    // Then every launch walks setup again. Annoying, and still the safe
    // way to be wrong.
  }
  if (!db) return;
  try {
    await setDoc(ref(uid), { onboarding: FINISHED }, { merge: true });
  } catch {
    // As above.
  }
}

/**
 * Where an account belongs on *this* phone. The one place that decides,
 * because it used to be two: the splash and the sign-in screen disagreed
 * about what "nothing recorded" meant, and a new account fell through the
 * gap between them into the dashboard.
 *
 * The device flag is the authority on whether setup can be skipped. The
 * Firestore record only says where to resume, which is a different
 * question and the one it can actually answer.
 */
export async function routeFor(uid: string): Promise<string> {
  if (onboardedHere()) return "/tonight";
  if (!uid) return STEPS[0];
  const p = await readProgress(uid);
  const to = p.at === "step" ? p.route : STEPS[0];
  console.log(`[onboarding] cloud "${p.at}", not set up on this device → ${to}`);
  return to;
}
