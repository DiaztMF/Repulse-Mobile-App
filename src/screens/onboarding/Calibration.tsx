import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMonitor } from "@/state/monitor";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { GOOD, holdGate } from "@/lib/fitGate";

type Stage = "explain" | "fit" | "running" | "done";

/** Matches `record_baseline` in the firmware contract. */
const DURATION_S = 30;


/** The only progress ring in the app. Legitimate here because what it
 *  shows really is progress toward finishing, not a live value. */
function Ring({ progress, label }: { progress: number; label: string }) {
  const r = 78;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center">
      <svg width={188} height={188} className="-rotate-90">
        <circle cx={94} cy={94} r={r} fill="none" stroke="var(--color-faint)" strokeWidth={3} />
        <circle
          cx={94}
          cy={94}
          r={r}
          fill="none"
          stroke="var(--color-pulse)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span className="num absolute text-[length:var(--text-metric)]">{label}</span>
    </div>
  );
}

/**
 * O8 — Baseline calibration.
 *
 * Calibration refuses to start until contact is good. A loose band
 * produces a garbage baseline, and every personal threshold is measured
 * against that baseline for the next two weeks — so a bad one means
 * false alarms every night.
 */
export function Calibration() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("explain");
  const [quality, setQuality] = useState(0);
  const [stable, setStable] = useState(false);
  const [left, setLeft] = useState(DURATION_S);

  const { vitals, links } = useMonitor();
  const attached = links.band === "connected";
  // Read on a timer rather than rendered from, so a sample arriving every
  // second does not re-run the interval that is measuring the hold.
  const quality$ = useRef<number | null>(null);
  quality$.current = vitals ? vitals.signalQuality : null;

  // One timer owns both the sample and the hold check.
  //
  // The first version kept the hold in its own effect keyed on `quality`.
  // Because quality resamples every few hundred ms, every change ran the
  // cleanup and cancelled the pending timer, so the three seconds could
  // never elapse and the gate was impossible to pass. Tracking the start
  // in a local rather than across effects removes the race entirely.
  //
  // §3.1 puts signal quality in the low nibble of the vitals status byte,
  // and that is what this reads when there is a band to read it from. The
  // ramp below is only for a phone with no band attached — without it the
  // gate can never open, and the whole flow has to stay walkable on
  // synthetic data.
  //
  // This matters more than a fit indicator usually would: §3.1 says every
  // personal threshold for the next fortnight is measured against the
  // baseline recorded here, and a loose band produces a baseline made of
  // rubbish that then defines what counts as an anomaly.
  useEffect(() => {
    if (stage !== "fit") return;
    const t0 = Date.now();
    let goodSince: number | null = null;

    const id = setInterval(() => {
      const live = attached ? quality$.current : null;
      const ramp = Math.min(GOOD + 3, (Date.now() - t0) / 450);
      const q = live ?? Math.max(0, Math.round(ramp + (Math.random() * 2 - 1)));
      setQuality(q);

      const next = holdGate(q, goodSince, Date.now());
      goodSince = next.goodSince;
      setStable(next.stable);
    }, 250);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, attached]);

  useEffect(() => {
    if (stage !== "running") return;
    const id = setInterval(() => {
      setLeft((s: number) => {
        if (s <= 1) {
          clearInterval(id);
          setStage("done");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stage]);

  const fitCopy =
    quality >= GOOD
      ? "That is the right tension. Hold still."
      : quality >= GOOD - 4
        ? "Almost. One more notch."
        : "Too loose. Tighten it until it stops sliding.";

  return (
    <div className="bg-setup flex min-h-screen flex-col pb-8">
      {stage !== "running" && <PageHeader title="Calibration" />}

      <div className="flex flex-1 flex-col px-6">

      {stage === "explain" && (
        <>
          <h1 className="mt-8 text-[length:var(--text-title)] font-medium leading-snug">
            First, your resting pulse
          </h1>
          <p className="mt-4 text-[var(--color-ash)]">
            RePulse needs to learn what calm looks like for you. Every threshold
            it uses later is measured against this one reading.
          </p>
          <p className="mt-3 text-[var(--color-ash)]">
            It takes about three minutes. Sit down, stay still, and do not talk.
          </p>
          <div className="flex-1" />
          <Button size="lg" register="system" onClick={() => setStage("fit")}>
            Start
          </Button>
        </>
      )}

      {stage === "fit" && (
        <>
          <h1 className="mt-8 text-[length:var(--text-title)] font-medium leading-snug">
            Tighten the band until the bar is full
          </h1>

          <div className="mt-10">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-faint)]">
              <div
                className="h-full rounded-full bg-[var(--color-pulse)] transition-[width] duration-300"
                style={{ width: `${Math.min(100, (quality / GOOD) * 100)}%` }}
              />
            </div>
            <p className="label mt-3 text-[var(--color-ash)]">Signal quality</p>
          </div>

          <p className="mt-6 text-[var(--color-ash)]">{fitCopy}</p>

          <div className="flex-1" />
          <Button
            size="lg"
            register="system"
            disabled={!stable}
            onClick={() => setStage("running")}
          >
            Start calibration
          </Button>
        </>
      )}

      {stage === "running" && (
        <>
          <p className="label mt-16 text-center text-[var(--color-ivory)]">
            Recording
          </p>
          <div className="mt-12 flex justify-center">
            <Ring
              progress={1 - left / DURATION_S}
              label={`${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}
            />
          </div>
          <p className="mt-12 text-center text-[var(--color-ash)]">
            Stay still. Do not talk.
          </p>
          <div className="flex-1" />
          <button
            onClick={() => setStage("fit")}
            className="label self-center text-[var(--color-ash)]"
          >
            Cancel
          </button>
        </>
      )}

      {stage === "done" && (
        <>
          <p className="label mt-16 text-center text-[var(--color-ivory)]">
            Your resting pulse
          </p>
          <p className="num mt-6 text-center text-[length:var(--text-hero)] leading-none">
            62
          </p>
          <p className="label mt-3 text-center text-[var(--color-ash)]">bpm</p>
          <p className="mt-10 text-center text-[var(--color-ash)]">
            Saved to the band, so it keeps working even when your phone does
            not.
          </p>
          <div className="flex-1" />
          <Button
            size="lg"
            register="system"
            onClick={() => navigate("/onboarding/contacts")}
          >
            Continue
          </Button>
        </>
      )}
      </div>
    </div>
  );
}
