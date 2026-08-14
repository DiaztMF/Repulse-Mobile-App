import { useRef, useState } from "react";
import { Check, Minus, X } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { useMonitor } from "@/state/monitor";
import { cn } from "@/lib/cn";

/**
 * The eight tests in `BLE_GATT_CONTRACT.md` §6, as a checklist that can be
 * run rather than a table that gets read once.
 *
 * The contract says these are what verification day and the demo are built
 * on. Written down in a document, they become eight things somebody has to
 * remember at a bench with two devices powered up and the clock running.
 * Here they are eight rows, and the failing one names itself.
 *
 * Four of them the app can judge alone. Four end in a motor turning, a
 * lamp dimming, or a siren sounding, and no amount of software can see
 * that — those are armed by the app and answered by a person. Pretending
 * otherwise would produce a green screen that proves nothing.
 */

type Verdict = "pass" | "fail" | "pending";

type Test = {
  n: number;
  title: string;
  passes: string;
  /** `judged` — the app decides. `observed` — a person decides. */
  kind: "judged" | "observed";
  arm: string;
};

const TESTS: Test[] = [
  {
    n: 1,
    title: "Band vibration",
    passes: "The motor moves within 1 second of the command",
    kind: "observed",
    arm: "Send vibrate",
  },
  {
    n: 2,
    title: "SOS button",
    passes: "The press reaches the app in under 2 seconds",
    kind: "judged",
    arm: "Arm, then press the band",
  },
  {
    n: 3,
    title: "Sunset",
    passes: "The lamp dims exponentially and ends below 3 lux",
    kind: "observed",
    arm: "Run sunset",
  },
  {
    n: 4,
    title: "Aroma safety limit",
    passes: "A 60-second request is refused with status 2",
    kind: "judged",
    arm: "Request 60s",
  },
  {
    n: 5,
    title: "Buffer flush",
    passes: "Every event returns with its real timestamp after 10 minutes apart",
    kind: "judged",
    arm: "Arm flush watch",
  },
  {
    n: 6,
    title: "Standalone siren",
    passes: "With the phone off, stage 3 broadcast makes the bedside sound alone",
    kind: "observed",
    arm: "Instructions",
  },
  {
    n: 7,
    title: "Vibration gating",
    passes: "The motor running does not cancel the escalation ladder",
    kind: "observed",
    arm: "Send hard vibrate",
  },
  {
    n: 8,
    title: "Off-wrist",
    passes: "A band on a table never raises an ALERT",
    kind: "judged",
    arm: "Watch for 60s",
  },
];

export function Conformance() {
  const { command, send, listen, links, synthetic } = useMonitor();
  const [verdicts, setVerdicts] = useState<Record<number, Verdict>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [armed, setArmed] = useState<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const set = (n: number, v: Verdict, note?: string) => {
    setVerdicts((s) => ({ ...s, [n]: v }));
    if (note) setNotes((s) => ({ ...s, [n]: note }));
    setArmed(null);
    cleanup.current?.();
    cleanup.current = null;
  };

  const arm = async (t: Test) => {
    setArmed(t.n);
    setNotes((s) => ({ ...s, [t.n]: "" }));

    switch (t.n) {
      case 1:
        await command({ cmd: "vibrate", pattern: "soft", durationMs: 800 });
        setNotes((s) => ({ ...s, 1: "Command sent. Did the motor move?" }));
        break;

      case 2: {
        // A real measurement: the contract gives this one a number, so the
        // app times it rather than asking anyone to feel confident.
        const sentAt = Date.now();
        cleanup.current = listen((e) => {
          if (e.kind !== "sos") return;
          const ms = Date.now() - sentAt;
          set(2, ms < 2000 ? "pass" : "fail", `Arrived in ${ms} ms`);
        });
        setNotes((s) => ({ ...s, 2: "Waiting — hold the band's SOS button for 2 seconds" }));
        break;
      }

      case 3:
        await send({ kind: "light", mode: "sunset" });
        setNotes((s) => ({ ...s, 3: "Sunset running. Watch the curve, then read the lux." }));
        break;

      case 4:
        // §4.3 requires a refusal with status 2, not a silent clamp — a
        // firmware that quietly runs 30s instead looks identical from here
        // unless it says no out loud.
        //
        // Our own encoder clamps to 30 before sending, so this deliberately
        // goes around it: the point is to hear the device refuse, not to
        // watch ourselves behave.
        cleanup.current = listen((e) => {
          if (e.kind !== "ack") return;
          set(
            4,
            e.status === "refused" ? "pass" : "fail",
            e.status === "refused"
              ? "Refused with status 2, as required"
              : `Answered "${e.status}" — the limit was not enforced`,
          );
        });
        await send({ kind: "aroma", seconds: 60 });
        setNotes((s) => ({
          ...s,
          4: "Requested 60s. Waiting for the confirmation to come back refused.",
        }));
        break;

      case 5:
        setNotes((s) => ({
          ...s,
          5: "Power the phone's Bluetooth off for 10 minutes, then reconnect.",
        }));
        break;

      case 6:
        setNotes((s) => ({
          ...s,
          6: "Power the phone off entirely. Trigger stage 3 on the band. The bedside must sound with no phone present.",
        }));
        break;

      case 7:
        await command({ cmd: "vibrate", pattern: "hard", durationMs: 800 });
        setNotes((s) => ({
          ...s,
          7: "Hard vibration running. The ladder must keep climbing, not reset.",
        }));
        break;

      case 8: {
        let alerted = false;
        cleanup.current = listen((e) => {
          if (e.kind === "escalation" && e.data.stage > 0) alerted = true;
        });
        setNotes((s) => ({ ...s, 8: "Watching. Leave the band off your wrist." }));
        window.setTimeout(() => {
          set(8, alerted ? "fail" : "pass", alerted ? "An ALERT was raised" : "Quiet for 60s");
        }, 60_000);
        break;
      }
    }
  };

  const ready = links.band === "connected" || links.bedside === "connected";
  const passed = TESTS.filter((t) => verdicts[t.n] === "pass").length;
  const failed = TESTS.filter((t) => verdicts[t.n] === "fail").length;

  return (
    <div className="pb-8">
      <PageHeader title="GATT conformance" showMenu right={`${passed}/${TESTS.length}`} />

      <div className="px-5">
        <p className="text-[var(--color-ash)]">
          The eight checks in the GATT contract §6. Run these with both
          devices powered before anything else is trusted.
        </p>

        {/* The honesty this screen lives or dies on. Every one of these
            passes against the mock, and a green column that proves nothing
            is worse than no column at all. */}
        {synthetic && (
          <p className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-band-poor)] p-4 text-[length:var(--text-meta)] text-[var(--color-band-poor)]">
            Running against the mock. Everything here will pass, and none of
            it says anything about the firmware. Connect real devices first.
          </p>
        )}

        {!synthetic && !ready && (
          <p className="mt-4 text-[length:var(--text-meta)] text-[var(--color-ash)]">
            No device connected yet.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {TESTS.map((t) => {
            const v = verdicts[t.n] ?? "pending";
            return (
              <div
                key={t.n}
                className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background:
                        v === "pass"
                          ? "var(--color-pulse)"
                          : v === "fail"
                            ? "var(--color-band-poor)"
                            : "var(--color-faint)",
                    }}
                  >
                    {v === "pass" ? (
                      <Check className="size-3.5 text-[var(--color-base)]" strokeWidth={3} />
                    ) : v === "fail" ? (
                      <X className="size-3.5 text-[var(--color-base)]" strokeWidth={3} />
                    ) : (
                      <Minus className="size-3 text-[var(--color-ash)]" strokeWidth={3} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[length:var(--text-card)] font-medium">
                      <span className="num text-[var(--color-ash)]">
                        {String(t.n).padStart(2, "0")}
                      </span>{" "}
                      {t.title}
                    </p>
                    <p className="mt-1 text-[length:var(--text-meta)] text-[var(--color-ash)]">
                      {t.passes}
                    </p>
                    {notes[t.n] && (
                      <p
                        className={cn(
                          "mt-2 text-[length:var(--text-meta)]",
                          armed === t.n
                            ? "text-[var(--color-pulse)]"
                            : "text-[var(--color-ash)]",
                        )}
                      >
                        {notes[t.n]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => void arm(t)}
                    className="label h-11 rounded-[var(--radius-pill)] border border-[var(--color-pulse)] px-4 text-[var(--color-pulse)]"
                  >
                    {t.arm}
                  </button>
                  {/* Offered for every row, including the judged ones. A
                      person watching the bench outranks a timer. */}
                  <button
                    onClick={() => set(t.n, "pass")}
                    className="label h-11 rounded-[var(--radius-pill)] border border-[var(--color-ash-dim)] px-4 text-[var(--color-ivory)]"
                  >
                    Passed
                  </button>
                  <button
                    onClick={() => set(t.n, "fail")}
                    className="label h-11 rounded-[var(--radius-pill)] border border-[var(--color-ash-dim)] px-4 text-[var(--color-ivory)]"
                  >
                    Failed
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="label mt-8 text-[var(--color-ash)]">
          {passed} passed · {failed} failed · {TESTS.length - passed - failed} not run
        </p>

        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            const lines = TESTS.map(
              (t) =>
                `${String(t.n).padStart(2, "0")}  ${(verdicts[t.n] ?? "not run").toUpperCase().padEnd(7)}  ${t.title}${notes[t.n] ? ` — ${notes[t.n]}` : ""}`,
            );
            void navigator.clipboard.writeText(
              [`RePulse GATT conformance — ${new Date().toISOString()}`, ...lines].join("\n"),
            );
          }}
        >
          Copy results
        </Button>
      </div>
    </div>
  );
}
