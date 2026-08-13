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

  // Sign in, or create the account if there is none. Onboarding is the
  // first run, so a separate register screen would only ask people to
  // choose a door before they know which one they are behind.
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      navigate("/permissions");
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code === "auth/user-not-found") {
        try {
          await auth.register(email, password);
          navigate("/permissions");
          return;
        } catch {
          setError("Could not create that account.");
        }
      } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("That email and password do not match.");
      } else if (code === "auth/email-already-in-use") {
        setError("That email already has an account.");
      } else {
        setError("Could not sign in. Check your connection.");
      }
    } finally {
      setBusy(false);
    }
  };

  const signIn = () => run(() => auth.signIn(email, password));

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
        onClick={() =>
          looksLikeEmail(email)
            ? run(async () => {
                await auth.reset(email);
                setError("Reset link sent. Check your inbox.");
                throw new Error("handled");
              })
            : setError("Enter your email first, then tap this.")
        }
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
          onClick={() => run(auth.google)}
        >
          Continue with Google
        </Button>
      </div>

      <p className="mt-14 text-center text-[var(--color-ash)]">
        Don't have an account yet?
      </p>
      <button
        onClick={() => valid && run(() => auth.register(email, password))}
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
