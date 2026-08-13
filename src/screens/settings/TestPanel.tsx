import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

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
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [aromaAllowed, setAromaAllowed] = useState(false);

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
      <PageHeader title="Test panel" />

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
      </div>
    </div>
  );
}
