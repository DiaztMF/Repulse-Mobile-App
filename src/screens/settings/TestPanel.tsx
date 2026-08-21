import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useAuth } from "@/firebase/auth";
import { configured } from "@/firebase/app";
import { seed, reset } from "@/firebase/nights";
import { NIGHTS, INTERVENTIONS } from "@/data/mock";
import * as m0 from "@/lib/m0";
import { useMonitor } from "@/state/monitor";
import type { Scenario } from "@/ble/mock";
import { RepulseMonitor } from "repulse-monitor";

/** The five §11.5 names, in the order a demo would want them. */
const SCENARIOS: [Scenario, string][] = [
  ["normal", "Play a normal night"],
  ["restless", "Play a restless spell"],
  ["anomaly-recovers", "Anomaly, the body answers"],
  ["anomaly-sos", "Anomaly with no response, to SOS"],
  ["dropout-flush", "Dropout, then buffer flush"],
];

/**
 * `act` is the entire point of a row, and it was missing.
 *
 * These six buttons flipped a label to "On" and sent nothing — `toggle`
 * only ever wrote to local state. A panel whose stated job is "drives each
 * actuator directly" was wired to no actuator at all, which is the worst
 * kind of test tool: one that reports success without doing anything.
 *
 * `momentary` is for a vibration, which has no "off" to return to.
 */
type Row = {
  key: string;
  label: string;
  note: string;
  /** Positions the button cycles through, counting off. Two unless a
   *  row has something to calibrate — white noise has four, because
   *  "is it loud enough" cannot be answered at one fixed volume. */
  steps?: number;
  act: (step: number) => Promise<void>;
  momentary?: boolean;
};

/**
 * D4 — Test panel. The only way to demonstrate the escalation ladder
 * without waiting for a real event, which makes it the one screen that
 * cannot be cut before a demo.
 */
export function TestPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const monitor = useMonitor();
  const [on, setOn] = useState<Record<string, number>>({});
  const [aromaAllowed, setAromaAllowed] = useState(false);
  const [dataMsg, setDataMsg] = useState<string | null>(null);
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<m0.Verdict | null>(null);
  const [checking, setChecking] = useState(m0.startedAt() !== null);
  const [nativeMsg, setNativeMsg] = useState<string | null>(null);
  const [actMsg, setActMsg] = useState<string | null>(null);
  /* Age, not just the reading. A number that is not moving and a radio
   * that stopped delivering look identical on screen, and telling them
   * apart by staring harder is not possible — the whole afternoon went
   * into a log line that had exactly this problem. */
  const [now, setNow] = useState(Date.now());
  const [snoring, setSnoring] = useState<boolean | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const listen = monitor.listen;
  useEffect(
    () => listen((e) => e.kind === "snore" && setSnoring(e.data.flagged)),
    [listen],
  );

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

  /* The notes say what is actually sent, not what somebody hoped was
   * sent. "volume 4" and "30 lux" were both wrong against `encodeActuator`
   * — the levels only go to 3, and the amber preset carries brightness,
   * never lux. A test panel that misdescribes its own command turns a
   * firmware bug and a copy bug into the same symptom. */
  const BEDSIDE: Row[] = [
    {
      key: "noise",
      label: "White noise",
      note: "tap to step 0 → 3 · volume 0, 10, 20, 30 · no fade",
      steps: 4,
      // No ramp here on purpose: a step you cannot hear for thirty
      // seconds is a step nobody can calibrate against.
      act: (n) => monitor.send({ kind: "noise", level: n as 0 | 1 | 2 | 3, fadeS: 0 }),
    },
    {
      key: "light",
      label: "Amber light",
      note: "2200K, 10% brightness",
      act: (n) => monitor.send({ kind: "light", mode: n ? "amber-dim" : "off" }),
    },
    {
      key: "aroma",
      label: "Aroma",
      note: "25s, capped at 30s in firmware",
      act: (n) => monitor.send({ kind: "aroma", seconds: n ? 25 : 0 }),
    },
    {
      key: "siren",
      label: "Siren",
      note: "emergency polarity",
      act: (n) => monitor.send({ kind: "siren", on: n > 0 }),
    },
  ];

  const BAND: Row[] = [
    {
      key: "soft",
      label: "Soft vibration",
      note: "stage 2 pattern, 800ms",
      momentary: true,
      act: () => monitor.command({ cmd: "vibrate", pattern: "soft", durationMs: 800 }),
    },
    {
      key: "hard",
      label: "Hard vibration",
      note: "stage 3 pattern, 2s",
      momentary: true,
      act: () => monitor.command({ cmd: "vibrate", pattern: "hard", durationMs: 2000 }),
    },
  ];

  const toggle = async (a: Row) => {
    const next = ((on[a.key] ?? 0) + 1) % (a.steps ?? 2);
    try {
      await a.act(next);
      setOn((s) => ({ ...s, [a.key]: a.momentary ? 0 : next }));
      setActMsg(null);
    } catch (e) {
      setActMsg(`${a.label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const Item = ({ a, disabled }: { a: Row; disabled?: boolean }) => (
    <button
      disabled={disabled}
      onClick={() => void toggle(a)}
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
        {!on[a.key] ? "Off" : (a.steps ?? 2) > 2 ? `Level ${on[a.key]}` : "On"}
      </span>
    </button>
  );

  return (
    <div className="pb-8">
      <PageHeader sample={false} title="Test panel" showMenu />

      <div className="px-5">
        <p className="text-[var(--color-ash)]">
          Drives each actuator directly, bypassing the state machine. Nothing
          here is recorded as a real event.
        </p>

        {/* Without this the panel is silent about the one thing that
            decides whether any button below can work: a command sent to a
            transport that is not connected resolves quietly, so an
            unplugged bedside and a broken actuator look identical. */}
        <p className="label mt-4 text-[var(--color-ash)]">
          bedside {monitor.links.bedside} · band {monitor.links.band}
        </p>

        {/* The only live view of the bedside's own sensors anywhere in the
            app — every other place the room appears is reading a stored
            night, so a sensor that had stopped reporting looked exactly
            like a night not yet recorded. §4.1 sends this every five seconds:
            a number that has not moved for 30 seconds is not a dead one.
            A dash for temperature means no DHT is answering. */}
        <h2 className="label mt-8 text-[var(--color-ash)]">Bedside sensors</h2>
        {monitor.room ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                ["BH1750", `${monitor.room.lux} lx`],
                ["INMP441", `${monitor.room.db} dB`],
                ["DHT11 temp", monitor.room.tempC != null ? `${monitor.room.tempC} °C` : "—"],
                ["DHT11 RH", monitor.room.humidityPct != null ? `${monitor.room.humidityPct} %` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-[var(--radius-control)] bg-[var(--color-surface)] p-4">
                  <p className="num text-[length:var(--text-title)]">{v}</p>
                  <p className="label mt-1 text-[var(--color-ash)]">{k}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[length:var(--text-meta)] text-[var(--color-ash)]">
              Last packet <span className="num">{Math.round((now - monitor.room.at) / 1000)}</span>s
              ago · every 5s · snoring{" "}
              {snoring == null ? "not reported" : snoring ? "yes" : "no"}
            </p>
          </>
        ) : (
          <p className="mt-2 text-[length:var(--text-meta)] text-[var(--color-ash)]">
            Nothing reported yet.
          </p>
        )}

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

        {actMsg && (
          <p className="mt-3 text-[length:var(--text-meta)] text-[var(--color-band-poor)]">
            {actMsg}
          </p>
        )}

        <h2 className="label mt-8 text-[var(--color-ash)]">Band</h2>
        <div className="mt-3 space-y-2">
          {BAND.map((a) => (
            <Item key={a.key} a={a} />
          ))}
        </div>

        {/* These play a night through the transport rather than navigating
            to a screen. The difference matters: an ALERT reached this way
            went through the state machine, cancelled whatever was running,
            and flipped every actuator — the same path a real anomaly takes.
            A button that routed to /alert proved none of that. */}
        <h2 className="label mt-8 text-[var(--color-ash)]">Escalation</h2>
        <p className="mt-2 text-[length:var(--text-meta)] text-[var(--color-ash)]">
          Plays a synthetic night through the same path a band would use.
          Body movement cancels it, exactly as it would at night.
        </p>
        <p className="label mt-4 text-[var(--color-ash)]">
          {monitor.phase}
          {monitor.stage > 0 ? ` · stage ${monitor.stage}` : ""}
        </p>
        <div className="mt-3 space-y-2">
          {SCENARIOS.map(([key, label]) => (
            <Button key={key} variant="secondary" onClick={() => void monitor.play(key)}>
              {label}
            </Button>
          ))}
          <Button variant="secondary" onClick={() => void monitor.stop()}>
            Stop playback
          </Button>
        </div>

        {/* The one thing M0 said had to stop being JavaScript. Ten seconds
            is enough to lock the phone and put it down — the point is to
            see the screen light up on its own, not to watch it happen
            while holding it. */}
        <h2 className="label mt-8 text-[var(--color-ash)]">Lock-screen alert</h2>
        <p className="mt-2 text-[length:var(--text-meta)] text-[var(--color-ash)]">
          Raises the native alert in 10 seconds. Lock the phone and wait.
          the screen has to wake by itself, over the lock screen.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            setNativeMsg("Lock the phone now. Ten seconds.");
            window.setTimeout(() => {
              void RepulseMonitor.raiseAlert({ stage: 3 })
                .then(() => setNativeMsg("Alert raised."))
                .catch((e) =>
                  setNativeMsg(`Could not raise it: ${e instanceof Error ? e.message : String(e)}`),
                );
            }, 10_000);
          }}
        >
          Raise alert in 10 seconds
        </Button>
        <Button
          variant="secondary"
          className="mt-3"
          onClick={() => void RepulseMonitor.clearAlert().catch(() => {})}
        >
          Clear the alert
        </Button>
        {nativeMsg && (
          <p className="mt-4 text-[length:var(--text-meta)] text-[var(--color-ash)]">
            {nativeMsg}
          </p>
        )}

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
                    silent for {Math.round(b.gapMs / 1000)}s
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
