import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { useTheme } from "@/state/theme";
import { useMonitor } from "@/state/monitor";
import { COPY } from "@/lib/copy";
import { cn } from "@/lib/cn";
import {
  readNoiseLevel,
  readNoiseTrack,
  writeNoiseLevel,
  writeNoiseTrack,
  type NoiseLevel,
  type NoiseTrack,
} from "@/lib/noise";
import { SunsetControls } from "@/components/settings/SunsetControls";
import {
  clampTuning,
  LIMITS,
  readTuning,
  writeTuning,
  type Tuning,
} from "@/lib/tuning";
import { DEFAULT_BASELINE_BPM, readBaseline, writeBaseline } from "@/lib/baseline";

/** Still a plain row, but now only for the handful of values nothing on
 *  this side can change — the light thresholds the bedside owns and the
 *  wake window. Everything the band's config characteristic accepts is a
 *  Stepper below. */
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
  name = "Level",
}: {
  label: string;
  note?: string;
  value: NoiseLevel | NoiseTrack;
  onChange: (v: 1 | 2 | 3) => void;
  name?: string;
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
            aria-label={`${name} ${n}`}
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

/**
 * A threshold somebody can actually move, at the granularity the firmware
 * stores it at.
 *
 * Minus and plus rather than a text field: these are written straight to
 * the band, and a field lets somebody leave "1" in it mid-typing while the
 * write fires. Holding to the steps in LIMITS also means no value can be
 * produced that the firmware would silently reject on arrival.
 */
function Stepper({
  label,
  note,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  note?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const nudge = (by: number) =>
    onChange(Math.round(Math.min(max, Math.max(min, value + by)) * 100) / 100);
  const Key = ({ by, glyph }: { by: number; glyph: string }) => (
    <button
      onClick={() => nudge(by)}
      disabled={by < 0 ? value <= min : value >= max}
      aria-label={`${label} ${by < 0 ? "down" : "up"}`}
      className="num size-9 shrink-0 rounded-full bg-[var(--color-surface)] text-[var(--color-ivory)] transition-opacity disabled:opacity-30"
    >
      {glyph}
    </button>
  );
  return (
    <div className="flex items-start justify-between gap-3 py-4">
      <span className="min-w-0">
        <span className="block">{label}</span>
        {note && (
          <span className="mt-0.5 block text-[length:var(--text-meta)] text-[var(--color-ash)]">
            {note}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <Key by={-step} glyph="−" />
        <span className="num w-14 text-center text-[var(--color-pulse)]">
          {format(value)}
        </span>
        <Key by={step} glyph="+" />
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
  const { monitorOnly, setMonitorOnly, configure } = useMonitor();
  const { theme, setTheme } = useTheme();
  const [noise, setNoise] = useState<NoiseLevel>(readNoiseLevel);
  const [track, setTrack] = useState<NoiseTrack>(readNoiseTrack);
  const [tuning, setTuning] = useState<Tuning>(readTuning);
  const [baseline, setBaseline] = useState(() => readBaseline() ?? DEFAULT_BASELINE_BPM);

  /* Ditulis ke penyimpanan DAN ke gelang. Hanya menyimpannya berarti
   * perubahan baru berlaku setelah sambungan berikutnya — yang untuk
   * ambang alarm palsu berarti satu malam penuh lagi dengan nilai lama.
   * Kegagalan kirim diabaikan: gelang menyimpan salinannya sendiri, dan
   * efek pada monitor.tsx mengirim ulang seluruh set setiap kali ia
   * tersambung. */
  const push = (patch: Partial<Tuning> & { baseline_bpm?: number }) =>
    void configure(patch).catch(() => {});

  const tune = (k: keyof Tuning) => (v: number) => {
    const next = { ...tuning, [k]: clampTuning(k, v) };
    setTuning(next);
    writeTuning(next);
    push({ [k]: next[k] });
  };
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
          {/* Three rows stood here and all three were fiction. "Sunset
              starts 21:40" described a scheduler that does not exist — the
              sunset begins when Start sleep is tapped, never on a clock.
              "Wake window 06:00–06:30" described a phase the machine has
              but that nothing anywhere dispatches. "Sunset duration" was
              the only true one, and it is now the slider below. Printing a
              number for a feature that is not there is worse than not
              mentioning it: somebody goes to bed expecting the lamp to dim
              on its own. */}
          <SunsetControls />
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
          <Level
            label="White noise sound"
            note="Which of the three bedside sounds plays. Takes effect the next time white noise starts."
            name="Sound"
            value={track}
            onChange={(v) => {
              setTrack(v);
              writeNoiseTrack(v);
            }}
          />
        </Section>

        <Section title="Detection thresholds">
          {/* The one number every other threshold is measured against. It
              belongs on this screen because calibration can be skipped,
              and a skipped calibration leaves the band comparing a real
              wrist against 62 bpm measured on nobody. */}
          <Stepper
            label="Resting pulse"
            note={
              readBaseline() === null
                ? "Not calibrated. This is a stand-in, so set your own."
                : "From calibration. Change it if the alerts feel wrong."
            }
            value={baseline}
            min={30}
            max={120}
            step={1}
            format={(v) => `${v} bpm`}
            onChange={(v) => {
              setBaseline(v);
              writeBaseline(v);
              push({ baseline_bpm: v });
            }}
          />
          <Stepper
            label="Pulse above baseline"
            note={`Alerts outside ${baseline - tuning.hr_threshold_delta}–${baseline + tuning.hr_threshold_delta} bpm. Raise it if the night keeps waking you.`}
            value={tuning.hr_threshold_delta}
            {...LIMITS.hr_threshold_delta}
            format={(v) => `±${v}`}
            onChange={tune("hr_threshold_delta")}
          />
          <Stepper
            label="Rhythm variability"
            note="How uneven the beat has to be before it counts. Higher is more forgiving."
            value={tuning.rr_variability_threshold}
            {...LIMITS.rr_variability_threshold}
            format={(v) => v.toFixed(2)}
            onChange={tune("rr_variability_threshold")}
          />
          {/* Not editable, and honestly so: the firmware config
              characteristic has no key for any of these three. */}
          <Row label="Oxygen dip" value="−3%" note="sustained 10s" />
          <Row label="Light pollution" value="5 lx" />
          <Row label="Optimal darkness" value="3 lx" />
        </Section>

        <Section title="Escalation">
          <Stepper
            label="Silent confirm"
            note="Nothing happens yet. The band is just watching."
            value={tuning.stage1_s}
            {...LIMITS.stage1_s}
            format={(v) => `${v}s`}
            onChange={tune("stage1_s")}
          />
          <Stepper
            label="Soft vibration"
            value={tuning.stage2_s}
            {...LIMITS.stage2_s}
            format={(v) => `${v}s`}
            onChange={tune("stage2_s")}
          />
          <Stepper
            label="Hard vibration"
            value={tuning.stage3_s}
            {...LIMITS.stage3_s}
            format={(v) => `${v}s`}
            onChange={tune("stage3_s")}
          />
          <Row
            label="Total before SOS"
            value={`${tuning.stage1_s + tuning.stage2_s + tuning.stage3_s}s`}
            note="then one tap from you"
          />
        </Section>

        <Section title="Testing">
          <Toggle
            label="Monitor only"
            note="Records and scores the night as usual, but sends no white noise, aroma or lamp. Alerts and the siren still work. A banner stays on the home screen while this is on."
            on={monitorOnly}
            onChange={setMonitorOnly}
          />
        </Section>

        <p className="mt-10 text-[length:var(--text-meta)] text-[var(--color-ash)]">
          Changes go to the band as you make them, and again every time it
          reconnects. If the band is off right now, it picks them up when it
          comes back.
        </p>

        <p className="label mt-8 text-center text-[var(--color-ash)]">
          {COPY.disclaimer}
        </p>
      </div>
    </div>
  );
}
