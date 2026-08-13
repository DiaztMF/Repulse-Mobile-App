import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { COPY } from "@/lib/copy";

const CONTACT = "Sari";

/**
 * X2 — SOS. Nothing here sends on its own, and the screen says so in the
 * one sentence that is not allowed to change. Wording that implies
 * automatic delivery would be a false claim about a safety feature.
 */
export function Sos() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-alert px-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-[var(--color-danger)]">
          <Check className="size-10 text-white" strokeWidth={2.5} />
        </span>
        <p className="label mt-8 text-[var(--color-ivory)]">Message sent</p>
        <p className="mt-4 max-w-[28ch] text-[var(--color-ash)]">
          {CONTACT} has your location and the time this was detected.
        </p>
        <button
          onClick={() => navigate("/tonight", { replace: true })}
          className="label mt-16 h-14 w-full max-w-[320px] rounded-[var(--radius-pill)] border border-[var(--color-ivory)] text-[var(--color-ivory)]"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-alert px-6 pb-8 pt-16">
      <p className="label text-center text-[var(--color-danger)]">
        Nobody has been contacted yet
      </p>
      <h1 className="mt-6 text-center text-[length:var(--text-title)] font-medium leading-snug">
        Send this to {CONTACT}?
      </h1>

      <div className="mt-10 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
        <p>Andi may need help.</p>
        <p className="mt-1">Detected at 02:16.</p>
        <p className="mt-1 text-[var(--color-ash)]">Location: maps.google.com/…</p>
      </div>

      {/* Regulated wording, held as a constant so it cannot drift. */}
      <p className="mt-6 text-center text-[var(--color-ash)]">
        {COPY.sosPending}
      </p>

      <div className="flex-1" />

      {/* The tallest button in the app, and the only one filled with the
          danger colour. */}
      <button
        onClick={() => setSent(true)}
        className="label h-16 w-full rounded-[var(--radius-pill)] bg-[var(--color-danger)] text-[length:var(--text-card)] text-white"
      >
        Send now
      </button>

      <button
        onClick={() => navigate("/tonight", { replace: true })}
        className="label mt-4 h-14 w-full rounded-[var(--radius-pill)] border border-[var(--color-ivory)] text-[var(--color-ivory)]"
      >
        Cancel — I am okay
      </button>
    </div>
  );
}
