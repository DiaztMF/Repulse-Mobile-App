import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { useAuth } from "@/firebase/auth";
import { STEPS, readProgress } from "@/firebase/onboarding";

/** Long enough for the 1100ms draw to finish and be seen. */
const DRAW_DWELL_MS = 1750;

/** PRD §10.2a: if auth has not answered by two seconds, go anyway. The
 *  guard pulls a signed-in user back once the answer arrives. */
const AUTH_CAP_MS = 2000;

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
  const [resume, setResume] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    const draw = setTimeout(() => setDrawn(true), DRAW_DWELL_MS);
    const cap = setTimeout(() => setCapped(true), AUTH_CAP_MS);
    return () => {
      clearTimeout(draw);
      clearTimeout(cap);
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
    void readProgress(user.uid).then((p) => {
      if (!live) return;
      // `start` — nothing recorded — used to land here as null, and null
      // means the dashboard. That is how a brand-new account skipped the
      // whole of onboarding and could never get back to it: sign in with
      // Google, let the native chooser restart the activity, and the app
      // comes back up here rather than at the screen that was about to be
      // navigated to. Splash then waves them through, and because they are
      // signed in from then on they never see the sign-in screen that would
      // have sent them to setup. The permissions are never granted, and the
      // first night fails in silence.
      //
      // It leans the way SignIn leans, and for the same reason: walking a
      // finished account through setup once costs some taps, while waving a
      // new one through costs every permission the night depends on. An
      // account that finishes writes `done` and is never asked again.
      //
      // `unknown` still lands on the dashboard. That is a read that failed
      // for somebody already inside, which is not evidence of anything.
      const next = p.at === "step" ? p.route : p.at === "start" ? STEPS[0] : null;
      console.log(`[splash] progress "${p.at}" → ${next ?? "/tonight"}`);
      setResume(next);
      setAsked(true);
    });
    return () => {
      live = false;
    };
  }, [ready, user]);

  const settled = (asked && drawn) || capped;

  useEffect(() => {
    if (!settled) return;

    // On the cap, `resume` may not have arrived. Sending a signed-in user
    // into the app is the right way to lose that race: they can still
    // reach any step, whereas holding the splash gets them nowhere.
    const to = user ? (resume ?? "/tonight") : "/sign-in";

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
