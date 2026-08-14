import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useAuth } from "@/firebase/auth";
import { configured } from "@/firebase/app";
import { seed, reset } from "@/firebase/nights";
import { NIGHTS, INTERVENTIONS } from "@/data/mock";
import * as m0 from "@/lib/m0";

type Actuator = { key: string; label: string; note: string };

const BEDSIDE: Actuator[] = [
  { key: "noise", label: "White noise", note: "track 2, volume 4" },
  { key: "light", label: "Amber light", note: "2200K, 30 lux" },
  { key: "aroma", label: "Aroma", note: "25s, capped in firmware" },
  { key: "siren", label: "Siren", note: "emergency polarity" },
];

const BAND: Actuator[] = [
  { key: "soft", label: "Soft vibration", note: "stage 2 pattern" },
  { key: "hard", label: "Hard vibration", note: "stage 3 pattern" },
];

/**
 * D4 — Test panel. The only way to demonstrate the escalation ladder
 * without waiting for a real event, which makes it the one screen that
 * cannot be cut before a demo.
 */
export function TestPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [aromaAllowed, setAromaAllowed] = useState(false);
  const [dataMsg, setDataMsg] = useState<string | null>(null);
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<m0.Verdict | null>(null);
  const [checking, setChecking] = useState(m0.startedAt() !== null);

  const minutes = (ms: number) => `${Math.round(ms / 60000)} min`;

  const startGate = async () => {
    if (!user) return;
    setGateMsg("Starting…");
    try {
      await m0.start(user.uid);
      setChecking(true);
      setGateMsg("Running. Lock the phone and leave it until morning.");
    } catch (e) {
      setGateMsg(`Could not start: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const stopGate = async () => {
    await m0.stop(user?.uid);
    setChecking(false);
    setGateMsg("Stopped.");
  };

  const readGate = async () => {
    if (!user) return;
    setGateMsg("Reading…");
    const v = await m0.verdict(user.uid);
    setVerdict(v);
    setGateMsg(v ? null : "No run recorded yet.");
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setDataMsg(`${label}…`);
    try {
      await fn();
      setDataMsg(`${label} done`);
    } catch {
      setDataMsg(`${label} failed`);
    }
  };

  const toggle = (k: string) => setOn((s) => ({ ...s, [k]: !s[k] }));

  const Item = ({ a, disabled }: { a: Actuator; disabled?: boolean }) => (
    <button
      disabled={disabled}
      onClick={() => toggle(a.key)}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-[var(--radius-control)] px-4 py-4 text-left",
        on[a.key] ? "bg-[var(--color-raised)]" : "bg-[var(--color-surface)]",
        disabled && "opacity-40",
      )}
    >
      <span>
        <span className="block">{a.label}</span>
        <span className="mt-0.5 block text-[length:var(--text-meta)] text-[var(--color-ash)]">
          {a.note}
        </span>
      </span>
      <span
        className={cn(
          "label shrink-0",
          on[a.key] ? "text-[var(--color-pulse)]" : "text-[var(--color-ash-dim)]",
        )}
      >
        {on[a.key] ? "On" : "Off"}
      </span>
    </button>
  );

  return (
    <div className="pb-8">
      <PageHeader title="Test panel" showMenu />

      <div className="px-5">
        <p className="text-[var(--color-ash)]">
          Drives each actuator directly, bypassing the state machine. Nothing
          here is recorded as a real event.
        </p>

        <h2 className="label mt-8 text-[var(--color-ash)]">Bedside unit</h2>
        <div className="mt-3 space-y-2">
          {BEDSIDE.map((a) => (
            <Item key={a.key} a={a} disabled={a.key === "aroma" && !aromaAllowed} />
          ))}
        </div>

        {/* Off by default: a diffuser running in a closed room during a
            demo is a real risk for anyone in the audience with asthma. */}
        <label className="mt-3 flex items-center gap-3 px-1">
          <input
            type="checkbox"
            checked={aromaAllowed}
            onChange={(e) => setAromaAllowed(e.target.checked)}
            className="size-4 accent-[var(--color-pulse)]"
          />
          <span className="text-[length:var(--text-meta)] text-[var(--color-ash)]">
            Allow aroma during this demo
          </span>
        </label>

        <h2 className="label mt-8 text-[var(--color-ash)]">Band</h2>
        <div className="mt-3 space-y-2">
          {BAND.map((a) => (
            <Item key={a.key} a={a} />
          ))}
        </div>

        <h2 className="label mt-8 text-[var(--color-ash)]">Escalation</h2>
        <p className="mt-2 text-[length:var(--text-meta)] text-[var(--color-ash)]">
          Starts the real ladder. Body movement cancels it, exactly as it
          would at night.
        </p>
        <Button
          size="lg"
          register="system"
          className="mt-4"
          onClick={() => navigate("/alert")}
        >
          Trigger anomaly
        </Button>

        <h2 className="label mt-8 text-[var(--color-ash)]">Shortcuts</h2>
        <p className="mt-2 text-[length:var(--text-meta)] text-[var(--color-ash)]">
          Baseline calibration takes three minutes, which is three minutes of
          nothing to watch in front of an audience.
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate("/ready")}>
          Skip calibration
        </Button>
        <Button
          variant="secondary"
          className="mt-3"
          onClick={() => navigate("/emergency/watched")}
        >
          Show a watched person's alert
        </Button>

        <h2 className="label mt-8 text-[var(--color-ash)]">Demo data</h2>
        <p className="mt-2 text-[length:var(--text-meta)] text-[var(--color-ash)]">
          {configured
            ? "Writes or clears the synthetic fortnight on this account. The insight screens need a fortnight of history before they say anything."
            : "Firebase is not configured, so the app is already running on synthetic data."}
        </p>
        <div className="mt-4 space-y-3">
          <Button
            variant="secondary"
            disabled={!configured || !user}
            onClick={() => user && run("Seed", () => seed(user.uid, NIGHTS, INTERVENTIONS))}
          >
            Seed 14 nights
          </Button>
          {/* Synthetic rows left behind in a real account are worse than
              an empty screen, so clearing is one tap. */}
          <Button
            variant="secondary"
            disabled={!configured || !user}
            onClick={() => user && run("Reset", () => reset(user.uid))}
          >
            Clear all night data
          </Button>
        </div>
        {dataMsg && (
          <p className="label mt-4 text-[var(--color-ash)]">{dataMsg}</p>
        )}

        {/* M0 — the architecture gate. PRD §3.5: the foreground service
            plugin does not promise that JavaScript keeps running, and the
            detection loop is JavaScript. This measures the only claim that
            matters, and it has to be answered before anything is built on
            top of the assumption. */}
        <h2 className="label mt-8 text-[var(--color-ash)]">
          Background continuity
        </h2>
        <p className="mt-2 text-[length:var(--text-meta)] text-[var(--color-ash)]">
          Writes a tick every 30 seconds for as long as the phone is left
          alone. Acceptance A1: eight hours with the screen off and no gap
          longer than 60 seconds.
        </p>

        <div className="mt-4 space-y-3">
          {checking ? (
            <Button variant="secondary" onClick={stopGate}>
              Stop the check
            </Button>
          ) : (
            <Button variant="secondary" disabled={!user} onClick={startGate}>
              Start overnight check
            </Button>
          )}
          <Button variant="secondary" disabled={!user} onClick={readGate}>
            Read last night's result
          </Button>
        </div>

        {gateMsg && (
          <p className="mt-4 text-[length:var(--text-meta)] text-[var(--color-ash)]">
            {gateMsg}
          </p>
        )}

        {verdict && (
          <div className="mt-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
            <p
              className="label"
              style={{
                color: verdict.passed
                  ? "var(--color-pulse)"
                  : "var(--color-breath)",
              }}
            >
              {verdict.passed ? "A1 passed" : "A1 failed"}
            </p>
            {/* Ticks against ticks expected, because "7 ticks" sounds like
                a result and "7 of 511" is one. */}
            <p className="mt-3 text-[length:var(--text-meta)] text-[var(--color-ash)]">
              <span className="num">{verdict.ticks}</span> of{" "}
              <span className="num">{verdict.expected}</span> ticks over{" "}
              {minutes(verdict.spanMs)}. Worst gap{" "}
              {Math.round(verdict.worstGapMs / 1000)}s.
            </p>
            {/* Named, not summarised. "It mostly worked" is not an answer
                to a question that decides the architecture. */}
            {verdict.breaks.length > 0 && (
              <ul className="mt-3 space-y-1">
                {verdict.breaks.slice(0, 8).map((b) => (
                  <li
                    key={b.at}
                    className="text-[length:var(--text-meta)] text-[var(--color-ash)]"
                  >
                    <span className="num">
                      {new Date(b.at).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>{" "}
                    — silent for {Math.round(b.gapMs / 1000)}s
                  </li>
                ))}
                {verdict.breaks.length > 8 && (
                  <li className="text-[length:var(--text-meta)] text-[var(--color-ash)]">
                    and {verdict.breaks.length - 8} more
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
