import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { DeviceArt } from "@/components/ui/DeviceArt";
import { EcgTrace } from "@/components/home/EcgTrace";
import { COPY } from "@/lib/copy";

type Stage = "idle" | "recording" | "done";
const SECONDS = 30;

/**
 * D7 — ECG spot check. Not a passive measurement: the AD8232 needs a
 * finger on the second electrode, so it can never run during sleep.
 */
export function Ecg() {
  const [stage, setStage] = useState<Stage>("idle");
  const [contact, setContact] = useState(false);
  const [left, setLeft] = useState(SECONDS);

  // TODO: read lead-off detection from the band.
  useEffect(() => {
    if (stage !== "idle") return;
    const t = setTimeout(() => setContact(true), 2500);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== "recording") return;
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

  return (
    <div className="pb-8">
      <PageHeader title="Record ECG" showMenu />

      <div className="px-5">
        {stage === "idle" && (
          <>
            <div className="mt-4">
              <DeviceArt caption="Index finger of the other hand on the metal contact" />
            </div>
            <h1 className="mt-8 text-[length:var(--text-title)] font-medium leading-snug">
              Hold a finger on the side contact
            </h1>
            <p className="mt-3 text-[var(--color-ash)]">
              Sit still and do not talk. It takes {SECONDS} seconds.
            </p>

            <p className="label mt-8 flex items-center gap-3">
              <span
                className="size-2 rounded-full"
                style={{
                  background: contact
                    ? "var(--color-pulse)"
                    : "var(--color-ash-dim)",
                }}
              />
              <span
                className={
                  contact ? "text-[var(--color-pulse)]" : "text-[var(--color-ash)]"
                }
              >
                {contact ? "Good contact" : "No contact yet"}
              </span>
            </p>

            <Button
              size="lg"
              register="system"
              disabled={!contact}
              className="mt-6"
              onClick={() => setStage("recording")}
            >
              Start recording
            </Button>
          </>
        )}

        {stage === "recording" && (
          <>
            <p className="label mt-8 flex items-center gap-3 text-[var(--color-pulse)]">
              <span className="size-2 rounded-full bg-[var(--color-pulse)]" />
              Good contact
            </p>

            {/* The waveform is only ever drawn while contact is good. A
                garbage trace that looks like a real one is the most
                dangerous thing this app could show — someone would read
                a conclusion off it. */}
            <div className="mt-8">
              <EcgTrace height={140} />
            </div>

            <p className="num mt-8 text-[length:var(--text-metric)]">
              0:{String(left).padStart(2, "0")}
            </p>
            <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-[var(--color-faint)]">
              <div
                className="h-full rounded-full bg-[var(--color-pulse)] transition-[width] duration-1000"
                style={{ width: `${((SECONDS - left) / SECONDS) * 100}%` }}
              />
            </div>

            <Button variant="secondary" className="mt-8" onClick={() => setStage("idle")}>
              Cancel
            </Button>
          </>
        )}

        {stage === "done" && (
          <>
            <p className="label mt-8 text-[var(--color-ash)]">Recorded</p>
            <div className="mt-6">
              <EcgTrace height={140} />
            </div>

            <div className="mt-8 flex gap-8">
              <div>
                <p className="num text-[length:var(--text-metric)] leading-none">30</p>
                <p className="label mt-1 text-[var(--color-ash)]">seconds</p>
              </div>
              <div>
                <p className="num text-[length:var(--text-metric)] leading-none">64</p>
                <p className="label mt-1 text-[var(--color-ash)]">average bpm</p>
              </div>
            </div>

            {/* No rhythm classification. Calling it normal or irregular
                would be a diagnosis, and this device does not make them. */}
            <p className="mt-8 text-[var(--color-ash)]">
              Saved. Show this recording to a doctor if you were asked for one.
            </p>

            <Button size="lg" register="system" className="mt-6" onClick={() => setStage("idle")}>
              Record another
            </Button>
          </>
        )}

        <p className="label mt-10 text-center text-[var(--color-ash)]">
          {COPY.disclaimer}
        </p>
      </div>
    </div>
  );
}
