import { useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { COPY } from "@/lib/copy";
import { useAuth } from "@/firebase/auth";
import { readProgress } from "@/firebase/onboarding";

/** Only decides whether the button may light up. Firebase does the
 *  real verification. */
const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

type Message = {
  text: string;
  /** Which line turns Kiln Clay. Absent means it belongs to the screen,
   *  not to one input — network, quota, project configuration. */
  field?: "email" | "password";
  /** Good news. Same slot, but never in the error colour. */
  ok?: boolean;
};

/**
 * Anything unmapped shows its Firebase code. A generic message here turns
 * a broken sign-in into a dead end with no evidence — which is exactly how
 * an earlier version hid its own bug.
 *
 * `email-already-in-use` can only reach the user from the registration
 * attempt below, where it means the account exists and the password was
 * wrong. PRD §10.2a state 6.
 */
const EXPLAIN: Record<string, Message> = {
  "auth/invalid-email": {
    text: "That does not look like an email address.",
    field: "email",
  },
  "auth/weak-password": { text: "Use at least six characters.", field: "password" },
  /**
   * The account exists but the password did not open it. Google is named
   * because it is the other way this address could already be taken: an
   * account created through Google has no password at all, so without
   * this sentence that user retypes forever and never gets in.
   *
   * Both possibilities are offered rather than one asserted —
   * enumeration protection is exactly what stops us from knowing which.
   */
  "auth/email-already-in-use": {
    text: "That password does not match this account. If you signed up with Google, use the button below.",
    field: "password",
  },
  "auth/network-request-failed": { text: "No connection to Firebase." },
  "auth/too-many-requests": {
    text: "Too many attempts. Wait a minute and retry.",
  },
  "auth/operation-not-allowed": {
    text: "Email sign-in is switched off for this Firebase project.",
  },
  "auth/unauthorized-domain": {
    text: "This address is not in the Firebase authorised domains list.",
  },
  "auth/popup-blocked": { text: "The browser blocked the Google popup." },
  "auth/popup-closed-by-user": { text: "The Google window was closed." },
};

/**
 * O2 — Sign in. Ten states, listed in PRD §10.2a.
 *
 * One door: the button signs in, and creates the account if there is none.
 * There is no separate register control, because Firebase's email
 * enumeration protection collapses "no such user" and "wrong password"
 * into one code — the only way to tell them apart is to attempt the
 * registration and read what comes back, which the button already does.
 *
 * No back button: this screen comes from the splash, so there is nowhere
 * to go back to.
 */
export function SignIn() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  /**
   * The splash gives up after two seconds and sends everyone here, so on a
   * slow start an already-signed-in user lands on the login screen and
   * nothing sends them on — the guard only covers the shell, and it never
   * pushes anyone *away* from here.
   *
   * Answered once, on arrival. Reacting to `user` instead would fire the
   * moment a sign-in succeeded and skip the whole of onboarding.
   */
  const arrivedSignedIn = useRef<boolean | null>(null);
  if (arrivedSignedIn.current === null && auth.ready)
    arrivedSignedIn.current = !!auth.user;

  const codeOf = (e: unknown) => (e as { code?: string }).code ?? "";

  /**
   * The native Google chooser throws plain Errors with no Firebase code —
   * a missing SHA-1 arrives as "10:" and nothing else. Falling straight to
   * "unknown error" would throw away the only sentence that says what is
   * wrong, which is how the earlier version hid its own bug.
   */
  const explain = (code: string, e?: unknown): Message => {
    if (EXPLAIN[code]) return EXPLAIN[code];
    const detail = code || (e as { message?: string })?.message;
    return { text: `Sign-in failed (${detail || "unknown error"}).` };
  };

  /**
   * Where an authenticated user belongs. Signing out and back in used to
   * drop everyone at the first onboarding step, so a finished account was
   * marched through setup again every time.
   *
   * `start` means nothing was recorded, which here means the account has
   * not been through setup — there is nowhere to send them but the
   * beginning.
   *
   * `unknown` leans the same way, and that is the whole point of it being
   * a separate answer. Someone who has just signed in and cannot be looked
   * up is far more likely to be new than finished, and the two mistakes are
   * not the same size: sending a finished user through setup again costs
   * them some taps, while waving a new one through costs every permission
   * the night depends on. The splash leans the other way, because by then
   * they are already inside.
   */
  const destination = async (uid: string) => {
    if (!uid) {
      console.log("[auth] no uid — nothing to look up, sending to setup");
      return "/permissions";
    }
    const p = await readProgress(uid);
    const to = p.at === "step" ? p.route : p.at === "done" ? "/tonight" : "/permissions";
    // Logged because every wrong landing so far has been unanswerable from
    // the outside: the screen you end up on cannot tell you which of the
    // four answers put you there.
    console.log(`[auth] progress "${p.at}" → ${to}`);
    return to;
  };

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    setMessage(null);
    try {
      // `replace` so Android back does not return a signed-in user here.
      const res = await fn();
      const uid = typeof res === "string" ? res : "";
      console.log("[auth] signed in, uid present:", Boolean(uid));
      navigate(await destination(uid), { replace: true });
    } catch (e) {
      console.error("[auth]", e);
      setMessage(explain(codeOf(e), e));
    } finally {
      setBusy(false);
    }
  };

  /**
   * The button is always live, so this is where the input is judged.
   *
   * A greyed-out button never says what is missing, cannot be focused,
   * and so cannot be heard by a screen reader — and at 2am it reads as a
   * broken app rather than an unfinished form. Naming the problem on the
   * offending line and moving focus there costs one tap and explains
   * itself.
   */
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (!looksLikeEmail(email)) {
      setMessage({ text: "Enter your email address.", field: "email" });
      emailRef.current?.focus();
      return;
    }
    if (password.length < 6) {
      setMessage({ text: "At least six characters.", field: "password" });
      passwordRef.current?.focus();
      return;
    }

    return run(async () => {
      try {
        return await auth.signIn(email, password);
      } catch (err) {
        const code = codeOf(err);
        if (code !== "auth/invalid-credential" && code !== "auth/user-not-found")
          throw err;
        // Either there is no account or the password is wrong, and Firebase
        // will not say which. Try to create it: success means it was the
        // former, `email-already-in-use` means it was the latter.
        return await auth.register(email, password);
      }
    });
  };

  const reset = async () => {
    if (busy) return;
    if (!looksLikeEmail(email)) {
      setMessage({ text: "Enter your email address.", field: "email" });
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await auth.reset(email);
      setMessage({ text: "Reset link sent. Check your inbox.", ok: true });
    } catch (e) {
      console.error("[auth] reset", e);
      setMessage(explain(codeOf(e), e));
    } finally {
      setBusy(false);
    }
  };

  // The six-character rule is named before it is broken, not after — but
  // only once there is something to measure. A server error outranks it.
  const tooShort = password.length > 0 && password.length < 6;
  const passwordError =
    message?.field === "password"
      ? message.text
      : tooShort
        ? "At least six characters."
        : undefined;

  const screenMessage = message && !message.field ? message : null;

  if (arrivedSignedIn.current) return <Navigate to="/tonight" replace />;

  return (
    <div className="bg-setup flex min-h-screen flex-col px-6 pb-8 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
      <div className="flex justify-center">
        <Wordmark className="block h-auto w-[118px]" strokeWidth={6} />
      </div>

      {/* noValidate: the browser's own bubble for type="email" would be a
          second error system, in a style we do not control, arriving
          before ours. */}
      <form noValidate onSubmit={submit} className="mt-16 flex flex-1 flex-col">
        <div className="space-y-6">
          <Field
            ref={emailRef}
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={email}
            // Editing the line clears the complaint about it. Leaving it
            // red while it is being fixed is nagging, not feedback.
            onChange={(e) => {
              setEmail(e.target.value);
              if (message?.field === "email") setMessage(null);
            }}
            error={message?.field === "email" ? message.text : undefined}
          />
          <Field
            ref={passwordRef}
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (message?.field === "password") setMessage(null);
            }}
            error={passwordError}
          />
        </div>

        {/* Always in the DOM so a screen reader announces the change, and
            so an arriving error does not shove the layout down. */}
        <p
          aria-live="polite"
          className={
            "mt-4 min-h-5 text-[length:var(--text-meta)] " +
            (screenMessage?.ok
              ? "text-[var(--color-ash)]"
              : "text-[var(--color-breath)]")
          }
        >
          {screenMessage?.text ?? ""}
        </p>

        <button
          type="button"
          onClick={reset}
          disabled={busy}
          // Sentence case: this offers the user a choice, so it is the
          // content register, not the system one. DESIGN.md §7.2.
          className="-mx-2 flex min-h-11 w-fit items-center px-2 text-[var(--color-ash)] disabled:text-[var(--color-ash-dim)]"
        >
          Forgot your password?
        </button>

        {/* Primary action sits at the bottom of a step screen, with nothing
            below it but the compliance footer. DESIGN.md §6.9. */}
        <div className="flex-1" />

        <p className="text-[length:var(--text-meta)] text-[var(--color-ash)]">
          New here? Signing in creates your account.
        </p>

        <div className="mt-4 space-y-3">
          {/* Live from the first frame. Only the in-flight request greys
              it, and that state explains itself. */}
          <Button type="submit" size="lg" register="system" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          {/* Same register as the button above — two adjacent sign-in
              actions with different casing read as two systems. */}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            register="system"
            disabled={busy}
            onClick={() => run(auth.google)}
          >
            Continue with Google
          </Button>
        </div>
      </form>

      <p className="label mt-6 text-center text-[var(--color-ash)]">
        {COPY.disclaimer}
      </p>
    </div>
  );
}
