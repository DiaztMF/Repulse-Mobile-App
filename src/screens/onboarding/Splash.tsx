import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { useAuth } from "@/firebase/auth";
import { STEPS, onboardedHere, routeFor } from "@/firebase/onboarding";

/** Long enough for the 1100ms draw to finish and be seen. */
const DRAW_DWELL_MS = 1750;

/** PRD §10.2a. The deadline for the *Firestore* read below, which is the
 *  slow half and the one worth giving up on. */
const AUTH_CAP_MS = 2000;

/**
 * The deadline for Firebase Auth itself, and it is deliberately far away.
 *
 * `user` is null both when somebody is signed out and when the auth
 * listener has not answered yet, and the cap above used to treat those as
 * the same thing: two seconds after the splash appeared it read a null
 * that only meant "not yet" and sent a signed-in user to `/sign-in`. The
 * comment here claimed a guard would pull them back — it cannot, because
 * `/sign-in` is the one screen that is *not* behind `RequireAuth`, so they
 * simply stayed there looking at a login form for an account they were
 * already signed into.
 *
 * Restoring a session reads IndexedDB from cold, which is slow on a modest
 * phone and slower still in a WebView that has just been rebuilt behind a
 * native dialog — Android's own "turn Bluetooth on?" being the one that
 * found this. So waiting is the correct behaviour; this is only the last
 * resort for a listener that never fires at all.
 */
const AUTH_HARD_CAP_MS = 8000;

/**
 * O1 — Splash. Holds until auth state is known, then forwards to O2 when
 * signed out, to the unfinished onboarding step when there is one, and to
 * M1 otherwise. No spinner: if it takes longer than two seconds, the
 * animation isn't the problem.
 *
 * The previous version used a fixed timer and always went to sign-in,
 * which asked a signed-in user to sign in again on every cold start.
 */
export function Splash() {
  const navigate = useNavigate();
  const { ready, user } = useAuth();
  const [drawn, setDrawn] = useState(false);
  const [capped, setCapped] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [resume, setResume] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    const draw = setTimeout(() => setDrawn(true), DRAW_DWELL_MS);
    const cap = setTimeout(() => setCapped(true), AUTH_CAP_MS);
    const hard = setTimeout(() => setGaveUp(true), AUTH_HARD_CAP_MS);
    return () => {
      clearTimeout(draw);
      clearTimeout(cap);
      clearTimeout(hard);
    };
  }, []);

  // Where a returning user left onboarding, if they left it unfinished.
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setAsked(true);
      return;
    }
    let live = true;
    void routeFor(user.uid).then((to) => {
      if (!live) return;
      setResume(to);
      setAsked(true);
    });
    return () => {
      live = false;
    };
  }, [ready, user]);

  /* The cap may only decide once auth has answered. Before that a null
   * `user` means "not yet", and nothing here is entitled to read it as
   * "signed out". */
  const settled = (asked && drawn) || (capped && ready) || gaveUp;

  useEffect(() => {
    if (!settled) return;

    // On the cap, `resume` may not have arrived — the Firestore read is
    // the slow half and this is the two-second deadline for it. But
    // whether this phone has been set up needs no network at all, so the
    // race is lost towards setup rather than towards the dashboard. A
    // finished phone still goes straight in; an unfinished one is no
    // longer waved past on a slow morning.
    const to = user
      ? (resume ?? (onboardedHere() ? "/tonight" : STEPS[0]))
      : "/sign-in";

    // Fades first, then leaves. `replace` so back never returns here.
    const go = setTimeout(() => navigate(to, { replace: true }), 500);
    return () => clearTimeout(go);
  }, [settled, user, resume, navigate]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[var(--color-base)] px-12 transition-opacity duration-500"
      style={{ opacity: settled ? 0 : 1 }}
    >
      <div className="w-full max-w-[260px]">
        <Wordmark animate className="block h-auto w-full" />
      </div>
    </div>
  );
}
