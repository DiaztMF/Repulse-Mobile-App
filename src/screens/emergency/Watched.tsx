import { useNavigate } from "react-router-dom";
import { AlertTriangle, Phone, MapPin } from "lucide-react";

const WHO = "Sari";

/**
 * X5 — Someone you watch needs help. Deliberately not X1.
 *
 * The alert screen is built for a person in danger with seconds to
 * respond. A person watching from elsewhere needs something entirely
 * different: a location and a phone number. It also does not seize the
 * screen — taking over the display of someone who may be driving
 * creates a second emergency.
 */
export function Watched() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-alert px-6 pb-8 pt-16">
      <AlertTriangle className="size-7 text-[var(--color-danger)]" strokeWidth={1.5} />
      <h1 className="mt-6 text-[length:var(--text-title)] font-medium leading-snug">
        {WHO} may need help
      </h1>
      <p className="mt-3 text-[var(--color-ash)]">Detected at 02:16 · 4 minutes ago</p>

      <dl className="mt-10 space-y-4 border-t border-[var(--color-ash-dim)]/30 pt-6">
        {[
          ["Pulse when detected", "124 bpm"],
          ["Stage reached", "Contacts alerted"],
          ["Last location", "Jl. Melati 14 · 02:16"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4">
            <dt className="text-[var(--color-ash)]">{k}</dt>
            <dd className="num text-right">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex-1" />

      <a
        href="tel:+6281234567890"
        className="label flex h-16 w-full items-center justify-center gap-3 rounded-[var(--radius-pill)] bg-[var(--color-danger)] text-[length:var(--text-card)] text-white"
      >
        <Phone className="size-5" strokeWidth={2} />
        Call {WHO}
      </a>

      <a
        href="https://maps.google.com/?q=-7.5595,110.8289"
        target="_blank"
        rel="noreferrer"
        className="label mt-3 flex h-14 w-full items-center justify-center gap-3 rounded-[var(--radius-pill)] border border-[var(--color-ivory)] text-[var(--color-ivory)]"
      >
        <MapPin className="size-5" strokeWidth={1.5} />
        Open in maps
      </a>

      {/* Stated plainly, because people will look for the button and its
          absence has to read as a decision rather than an omission. */}
      <p className="mt-8 text-center text-[length:var(--text-meta)] text-[var(--color-ash)]">
        You cannot cancel this alert from here. Only {WHO} can.
      </p>

      <button
        onClick={() => navigate(-1)}
        className="label mt-6 self-center text-[var(--color-ash)]"
      >
        Close
      </button>
    </div>
  );
}
