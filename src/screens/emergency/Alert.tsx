import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SampleBadge } from "@/components/shell/SampleBadge";
import { cn } from "@/lib/cn";

/** The ladder runs in the band's firmware. This screen mirrors it. */
const STAGES = [
  { n: "01", label: "Silent check" },
  { n: "02", label: "Soft vibration" },
  { n: "03", label: "Hard vibration" },
  { n: "04", label: "Alert your contacts" },
];

const START_STAGE = 2; // zero-indexed: hard vibration
const SECONDS = 30;

/**
 * X1 — ALERT. Centred because this is the system speaking and symmetry
 * means stop and read.
 *
 * There is no cancel button, and that is the product. What cancels an
 * alert is body movement, read by the band — a person having a cardiac
 * event cannot tap a screen, but a person who is fine will roll over.
 * The button below is a second path for when the phone is in reach, not
 * the mechanism.
 */
export function Alert() {
  const navigate = useNavigate();
  const [left, setLeft] = useState(SECONDS);
  // True when the phone has lost the band mid-ladder.
  const [estimated] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setLeft((s: number) => {
        if (s <= 1) {
          clearInterval(id);
          navigate("/sos", { replace: true });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-alert px-6 py-10 text-center">
      {/* The only numbered progression in the app. Here the order is the
          information: how far this has already gone. */}
      <ol className="flex w-full max-w-[300px] justify-between">
        {STAGES.map((s, i) => (
          <li key={s.n} className="flex flex-col items-center gap-2">
            <span
              className={cn(
                "num text-[length:var(--text-meta)]",
                i <= START_STAGE
                  ? "text-[var(--color-danger)]"
                  : "text-[var(--color-ash-dim)]",
              )}
            >
              {s.n}
            </span>
            <span
              className={cn(
                "h-0.5 w-12 rounded-full",
                i <= START_STAGE
                  ? "bg-[var(--color-danger)]"
                  : "bg-[var(--color-ash-dim)]/40",
              )}
            />
          </li>
        ))}
      </ol>
      <p className="label mt-4 text-[var(--color-ash)]">
        {STAGES[START_STAGE]!.label}
      </p>

      <p className="label mt-16 text-[var(--color-danger)]">
        Something looks wrong
      </p>
      <p className="mt-6 max-w-[28ch] text-[length:var(--text-title)] font-medium leading-snug">
        Your pulse has been irregular for 40 seconds
      </p>

      {/* Said before the countdown, because it is the thing that actually
          stops this and it costs no effort at all. */}
      <p className="mt-8 max-w-[30ch] text-[var(--color-ash)]">
        Move your arm and this stops. You do not have to reach for the phone.
      </p>

      <p className="num mt-12 text-[length:var(--text-hero)] leading-none text-[var(--color-danger)]">
        {left}
      </p>
      <p className="label mt-2 text-[var(--color-ash)]">
        {estimated ? "seconds · estimated" : "seconds until your contacts are alerted"}
      </p>

      <button
        onClick={() => navigate("/tonight", { replace: true })}
        className="label mt-16 h-14 w-full max-w-[320px] rounded-[var(--radius-pill)] border border-[var(--color-ivory)] text-[var(--color-ivory)]"
      >
        I am okay
      </button>

      {/* At the bottom edge, well clear of the countdown. A judge watching
          a heart rate on an emergency screen is entitled to know it did
          not come from a sensor — DESIGN §12 requires this on every screen
          while the mock layer is on, and this is the screen where an
          invented number would be taken most seriously. */}
      <div className="mt-10">
        <SampleBadge />
      </div>
    </div>
  );
}
