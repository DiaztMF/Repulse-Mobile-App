import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { COPY } from "@/lib/copy";
import { useAuth } from "@/firebase/auth";

/** Only decides whether the button may light up. Firebase does the
 *  real verification. */
const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

/**
 * O2 — Sign in. The submit button stays disabled until the input is
 * valid; that turn to accent is the only validation feedback, which is
 * why no error copy appears while the user is still typing.
 *
 * No back button — this screen comes from the splash, so there is
 * nowhere to go back to.
 */
export function SignIn() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = looksLikeEmail(email) && password.length >= 6;

  const codeOf = (e: unknown) => (e as { code?: string }).code ?? "";

  /** Anything unmapped shows its Firebase code. A generic message here
   *  turns a broken sign-in into a dead end with no evidence — which is
   *  exactly how the previous version hid its own bug. */
  const explain = (code: string) =>
    ({
      "auth/invalid-email": "That does not look like an email address.",
      "auth/weak-password": "Use at least six characters.",
      "auth/network-request-failed": "No connection to Firebase.",
      "auth/too-many-requests": "Too many attempts. Wait a minute and retry.",
      "auth/operation-not-allowed":
        "Email sign-in is switched off for this Firebase project.",
      "auth/unauthorized-domain":
        "This address is not in the Firebase authorised domains list.",
      "auth/popup-blocked": "The browser blocked the Google popup.",
      "auth/popup-closed-by-user": "The Google window was closed.",
    })[code] ?? `Sign-in failed (${code || "unknown error"}).`;

  const enter = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      navigate("/permissions");
    } catch (e) {
      console.error("[auth]", e);
      setError(explain(codeOf(e)));
    } finally {
      setBusy(false);
    }
  };

  /**
   * One door: sign in, and create the account if there is none.
   *
   * Email enumeration protection — on by default — collapses "no such
   * user" and "wrong password" into a single `invalid-credential`, so
   * the only way to tell them apart is to attempt the registration and
   * read what comes back.
   */
  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await auth.signIn(email, password);
      navigate("/permissions");
    } catch (e) {
      const code = codeOf(e);
      if (code !== "auth/invalid-credential" && code !== "auth/user-not-found") {
        console.error("[auth] sign in", e);
        setError(explain(code));
        return;
      }
      try {
        await auth.register(email, password);
        navigate("/permissions");
      } catch (e2) {
        console.error("[auth] register", e2);
        const c2 = codeOf(e2);
        setError(
          c2 === "auth/email-already-in-use"
            ? "That password does not match this account."
            : explain(c2),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-setup flex min-h-screen flex-col px-6 pb-8">
      <div className="flex justify-center pt-8">
        <Wordmark className="block h-auto w-[132px]" strokeWidth={6} />
      </div>

      {/* Deliberate breathing room above the fields. */}
      <div className="h-24 shrink-0" />

      <div className="space-y-6">
        <Field
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p className="mt-5 text-center text-[length:var(--text-meta)] text-[var(--color-breath)]">
          {error}
        </p>
      )}

      <button
        onClick={async () => {
          if (!looksLikeEmail(email)) {
            setError("Enter your email first, then tap this.");
            return;
          }
          try {
            await auth.reset(email);
            setError("Reset link sent. Check your inbox.");
          } catch (e) {
            console.error("[auth] reset", e);
            setError(explain(codeOf(e)));
          }
        }}
        className="label mt-7 self-center text-[var(--color-ivory)]"
      >
        Forgot your password?
      </button>

      <div className="mt-6 space-y-3">
        <Button
          size="lg"
          register="system"
          disabled={!valid || busy}
          onClick={signIn}
        >
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        {/* Same register as the button above — two adjacent sign-in
            actions with different casing read as two systems. */}
        <Button
          variant="secondary"
          size="lg"
          register="system"
          onClick={() => enter(auth.google)}
        >
          Continue with Google
        </Button>
      </div>

      <p className="mt-14 text-center text-[var(--color-ash)]">
        Don't have an account yet?
      </p>
      <button
        onClick={() => valid && enter(() => auth.register(email, password))}
        className="label mt-3 self-center text-[var(--color-pulse)]"
      >
        Create account
      </button>

      {/* Pushes the disclaimer to the bottom edge. */}
      <div className="flex-1" />

      <p className="label mt-8 text-center text-[var(--color-ash-dim)]">
        {COPY.disclaimer}
      </p>
    </div>
  );
}
