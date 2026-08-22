import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { useTheme } from "@/state/theme";
import { COPY } from "@/lib/copy";
import { cn } from "@/lib/cn";
import { readNoiseLevel, writeNoiseLevel, type NoiseLevel } from "@/lib/noise";

/** Rendered as a plain row, not a button. Editing thresholds needs the
 *  firmware config write, so a tappable row here would promise something
 *  that cannot happen yet — and a button that does nothing is worse than
 *  no button. */
function Row({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex w-full items-baseline justify-between gap-4 py-4 text-left">
      <span className="min-w-0">
        <span className="block">{label}</span>
        {note && (
          <span className="mt-0.5 block text-[length:var(--text-meta)] text-[var(--color-ash)]">
            {note}
          </span>
        )}
      </span>
      <span className="num shrink-0 text-[var(--color-ash)]">{value}</span>
    </div>
  );
}

function Toggle({
  label,
  note,
  on,
  onChange,
}: {
  label: string;
  note?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <span className="min-w-0">
        <span className="block">{label}</span>
        {note && (
          <span className="mt-0.5 block text-[length:var(--text-meta)] text-[var(--color-ash)]">
            {note}
          </span>
        )}
      </span>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn(
          "mt-1 flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
          on ? "bg-[var(--color-pulse)]" : "bg-[var(--color-faint)]",
        )}
      >
        <span
          className={cn(
            "size-5 rounded-full bg-[var(--color-base)] transition-transform",
            on && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

/** Three taps, not a slider. The band underneath only has four volume
 *  steps and one of them is silence, so a slider would invent a precision
 *  the hardware does not have and leave people hunting for a level that
 *  does not exist. */
function Level({
  label,
  note,
  value,
  onChange,
}: {
  label: string;
  note?: string;
  value: NoiseLevel;
  onChange: (v: NoiseLevel) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <span className="min-w-0">
        <span className="block">{label}</span>
        {note && (
          <span className="mt-0.5 block text-[length:var(--text-meta)] text-[var(--color-ash)]">
            {note}
          </span>
        )}
      </span>
      <span className="flex shrink-0 gap-2">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-label={`Level ${n}`}
            aria-pressed={value === n}
            className={cn(
              "num size-10 rounded-full transition-colors",
              value === n
                ? "bg-[var(--color-raised)] text-[var(--color-pulse)]"
                : "bg-[var(--color-surface)] text-[var(--color-ash-dim)]",
            )}
          >
            {n}
          </button>
        ))}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="label text-[var(--color-ash)]">{title}</h2>
      <div className="mt-2 divide-y divide-[var(--color-ash-dim)]/25">{children}</div>
    </section>
  );
}

/**
 * D1 — Settings. Every threshold in the appendix is reachable here, so a
 * bad default can be corrected on the night it shows up rather than in
 * the next build.
 */
export function SettingsScreen() {
  const [monitorOnly, setMonitorOnly] = useState(false);
  const { theme, setTheme } = useTheme();
  const [noise, setNoise] = useState<NoiseLevel>(readNoiseLevel);

  return (
    <div className="pb-8">
      <PageHeader sample={false} title="Settings" showMenu />

      <div className="px-5">
        <Section title="Appearance">
          <Toggle
            label="Light mode"
            note="Warm linen paper palette, calibrated for daylight readability while maintaining dark mode as default."
            on={theme === "light"}
            onChange={(light) => setTheme(light ? "light" : "dark")}
          />
        </Section>

        <Section title="Night">
          <Row label="Wake window" value="06:00–06:30" />
          <Row label="Sunset starts" value="21:40" note="20 minutes before bed" />
          <Row label="Sunset duration" value="25 min" note="exponential dimming" />
          {/* The one intervention setting that is genuinely personal: the
              level that settles one person keeps the next one awake. Every
              other row here is a threshold the firmware owns. */}
          <Level
            label="White noise volume"
            note="Used when the room is restless. An alert always sounds at full volume."
            value={noise}
            onChange={(v) => {
              setNoise(v);
              writeNoiseLevel(v);
            }}
          />
        </Section>

        <Section title="Detection thresholds">
          <Row label="Pulse above baseline" value="+16 bpm" />
          <Row label="Rhythm variability" value="0.18" />
          <Row label="Oxygen dip" value="−3%" note="sustained 10s" />
          <Row label="Light pollution" value="5 lx" />
          <Row label="Optimal darkness" value="3 lx" />
        </Section>

        <Section title="Escalation">
          <Row label="Silent confirm" value="20s" />
          <Row label="Soft vibration" value="15s" />
          <Row label="Hard vibration" value="30s" />
          <Row label="Total before SOS" value="65s" note="then one tap from you" />
        </Section>

        <Section title="Testing">
          <Toggle
            label="Monitor only"
            note="Records everything, runs no interventions. A banner stays on the home screen while this is on."
            on={monitorOnly}
            onChange={setMonitorOnly}
          />
        </Section>

        <p className="mt-10 text-[length:var(--text-meta)] text-[var(--color-ash)]">
          These values are written to the band during pairing. Editing them
          arrives with the firmware link.
        </p>

        <p className="label mt-8 text-center text-[var(--color-ash)]">
          {COPY.disclaimer}
        </p>
      </div>
    </div>
  );
}
