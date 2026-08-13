import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { COPY } from "@/lib/copy";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const valid = looksLikeEmail(email) && password.length >= 6;

  // TODO: wire to Firebase auth.
  const signIn = () => navigate("/permissions");

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

      <button className="label mt-7 self-center text-[var(--color-ivory)]">
        Forgot your password?
      </button>

      <div className="mt-6 space-y-3">
        <Button size="lg" register="system" disabled={!valid} onClick={signIn}>
          Sign in
        </Button>
        {/* Same register as the button above — two adjacent sign-in
            actions with different casing read as two systems. */}
        <Button
          variant="secondary"
          size="lg"
          register="system"
          onClick={signIn}
        >
          Continue with Google
        </Button>
      </div>

      <p className="mt-14 text-center text-[var(--color-ash)]">
        Don't have an account yet?
      </p>
      <button className="label mt-3 self-center text-[var(--color-pulse)]">
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
