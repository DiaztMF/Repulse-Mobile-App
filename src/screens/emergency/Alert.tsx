import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SampleBadge } from "@/components/shell/SampleBadge";
import { useMonitor } from "@/state/monitor";
import { cn } from "@/lib/cn";

/** The ladder runs in the band's firmware. This screen mirrors it. */
const STAGES = [
  { n: "01", label: "Silent check" },
  { n: "02", label: "Soft vibration" },
  { n: "03", label: "Hard vibration" },
  { n: "04", label: "Alert your contacts" },
];

/** GATT §3.5: stage 3 runs 35-65s, so stage 4 is thirty seconds after
 *  stage 3 begins. Used for the countdown only — what actually moves this
 *  screen on is the band reporting stage 4, never this number reaching
 *  zero. */
const TO_STAGE_4_S = 30;

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
  const { stage, links, vitals, synthetic } = useMonitor();
  const [left, setLeft] = useState(TO_STAGE_4_S);

  // PRD §5.5: when the band drops mid-ladder the countdown carries on and
  // is labelled an estimate. It does not pause. The band is still counting
  // on the wrist whether we can hear it or not, and freezing the number
  // here would be the screen telling a comfortable lie.
  const estimated = links.band !== "connected";

  const reached3 = useRef<number | null>(null);
  if (stage >= 3 && reached3.current === null) reached3.current = Date.now();
  if (stage < 3) reached3.current = null;

  useEffect(() => {
    if (stage < 3) return;
    const id = setInterval(() => {
      const from = reached3.current ?? Date.now();
      setLeft(Math.max(0, TO_STAGE_4_S - Math.round((Date.now() - from) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, [stage]);

  // Zero-indexed for the row of numbers above.
  const current = Math.max(0, Math.min(3, stage - 1));

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
                i <= current
                  ? "text-[var(--color-danger)]"
                  : "text-[var(--color-ash-dim)]",
              )}
            >
              {s.n}
            </span>
            <span
              className={cn(
                "h-0.5 w-12 rounded-full",
                i <= current
                  ? "bg-[var(--color-danger)]"
                  : "bg-[var(--color-ash-dim)]/40",
              )}
            />
          </li>
        ))}
      </ol>
      <p className="label mt-4 text-[var(--color-ash)]">
        {STAGES[current]!.label}
      </p>

      <p className="label mt-16 text-[var(--color-danger)]">
        Something looks wrong
      </p>
      <p className="mt-6 max-w-[28ch] text-[length:var(--text-title)] font-medium leading-snug">
        {vitals
          ? `Your pulse has been irregular at ${vitals.bpm} bpm`
          : "Your pulse has been irregular"}
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
      {synthetic && (
        <div className="mt-10">
          <SampleBadge />
        </div>
      )}
    </div>
  );
}
