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
import { ASKS, usePermissions } from "@/lib/permissions";
import { armSos, ownerName, rememberOwner } from "@/lib/sos";

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
 * Both ways in. The keys are for a small correction and the field is for
 * 62 to 78, which is eight taps of a key and one moment of typing.
 *
 * The reason it was keys only is real and is handled rather than avoided:
 * every change here is written straight to the band, so a field that
 * wrote on each keystroke would send the "7" of 78 and leave the band on
 * a threshold of seven until the next digit landed. So the field keeps
 * its own text while it is being edited and commits once, on blur or
 * Enter, clamped to the limits the firmware accepts. Escape puts the old
 * value back.
 *
 * Out-of-range typing is corrected rather than refused: 500 becomes the
 * maximum and the field shows what was actually stored. A silent refusal
 * leaves somebody believing they set 500.
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
  const fit = (n: number) => Math.round(Math.min(max, Math.max(min, n)) * 100) / 100;
  const nudge = (by: number) => onChange(fit(value + by));

  /* Null while nobody is typing, so the field follows the value the keys
   * produce. Once typing starts it holds the raw text, because "6" on the
   * way to "62" is not a number this row is allowed to store. */
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.replace(",", "."));
    // Empty, or something that is not a number at all: put the stored
    // value back rather than writing NaN to the band.
    if (draft.trim() !== "" && Number.isFinite(n)) onChange(fit(n));
    setDraft(null);
  };

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
        {/* Stated, because a value that snaps back on its own reads as a
            bug unless the limit was on screen before it was typed. */}
        <span className="mt-0.5 block text-[length:var(--text-meta)] text-[var(--color-ash-dim)]">
          {format(min)} to {format(max)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <Key by={-step} glyph="−" />
        <input
          // decimal, not numeric: rhythm variability is 0.18 and a keypad
          // with no separator cannot type it.
          inputMode="decimal"
          aria-label={label}
          value={draft ?? format(value)}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => {
            // The bare number to edit, never the formatted "20s": typing
            // over a unit is how "2s0" happens.
            setDraft(String(value));
            e.target.select();
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setDraft(null);
              e.currentTarget.blur();
            }
          }}
          className="num w-16 rounded-[var(--radius-pill)] bg-[var(--color-surface)] py-1.5 text-center text-[var(--color-pulse)] outline-none focus:ring-1 focus:ring-[var(--color-pulse)]"
        />
        <Key by={step} glyph="+" />
      </span>
    </div>
  );
}

/**
 * The same permissions O3 asks for during setup, read back live.
 *
 * Here rather than only there because a permission granted in July can be
 * revoked in September from Android's own settings, and the first place
 * anybody would look for that is this screen. Location and SMS in
 * particular decide whether an emergency message carries coordinates and
 * whether it can leave the phone at all, and both fail silently.
 */
function PermissionRows() {
  const { native, granted, busy, grant } = usePermissions();

  return (
    <>
      {!native && (
        <p className="py-3 text-[length:var(--text-meta)] text-[var(--color-ash)]">
          Browser preview. These belong to Android, and nothing here is really
          granted.
        </p>
      )}
      {ASKS.map((a) => {
        const ok = !!granted[a.id];
        return (
          <div key={a.id} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <p>{a.title}</p>
              <p className="mt-1 text-[length:var(--text-meta)] text-[var(--color-ash)]">
                {a.why}
              </p>
            </div>
            {ok ? (
              <span className="label shrink-0 pt-1 text-[var(--color-pulse)]">Allowed</span>
            ) : (
              <button
                disabled={busy === a.id}
                onClick={() => void grant(a.id)}
                className="label shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-ash-dim)] px-4 py-2 text-[var(--color-ash)] disabled:opacity-60"
              >
                {busy === a.id ? "Asking…" : a.action}
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}

/**
 * The name the emergency message opens with.
 *
 * A free text field rather than anything clever: this is read by a person
 * woken at 3am who has to know in one second whose emergency it is, and
 * the email local part the message used before was not that. Saved as it
 * is typed, and re-armed so the native sender has it too.
 */
function OwnerName() {
  const [name, setName] = useState(() => {
    const stored = ownerName();
    return stored === "Someone" ? "" : stored;
  });

  return (
    <div className="py-4">
      <label className="block" htmlFor="owner">
        <span>Your name</span>
        <span className="mt-1 block text-[length:var(--text-meta)] text-[var(--color-ash)]">
          The emergency message opens with this. Use the name your contacts
          call you, not your username.
        </span>
      </label>
      <input
        id="owner"
        value={name}
        maxLength={40}
        placeholder="Someone"
        onChange={(e) => {
          setName(e.target.value);
          rememberOwner(e.target.value);
          void armSos();
        }}
        className="mt-3 h-12 w-full rounded-[var(--radius-pill)] border border-[var(--color-ash-dim)] bg-transparent px-4 outline-none focus:border-[var(--color-pulse)]"
      />
      <p className="mt-3 text-[length:var(--text-meta)] text-[var(--color-ash)]">
        Preview: {(name.trim() || "Someone") + " may need help."}
      </p>
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

        <Section title="False alarms">
          {/* The first thing to reach for when the alert keeps coming
              back, and the reason it sits above the thresholds rather than
              under them: raising the pulse threshold makes the band blind
              to a real event, while making it wait longer only makes it
              blind to a flicker. */}
          <Stepper
            label="Must hold for"
            value={tuning.anomaly_hold_s}
            {...LIMITS.anomaly_hold_s}
            format={(v) => `${v}s`}
            onChange={tune("anomaly_hold_s")}
            note="How long the pulse has to stay out of range before anything happens. Raise this first if the alert keeps appearing while the band is still being adjusted."
          />
          <Stepper
            label="Signal quality needed"
            value={tuning.anomaly_min_quality}
            {...LIMITS.anomaly_min_quality}
            format={(v) => `${v}/15`}
            onChange={tune("anomaly_min_quality")}
            note="How clean the reading has to be before the band will act on it. Five is the lowest setting that guarantees a real recent beat. Lower it only if the Test Panel shows quality staying under it while the band is worn properly."
          />
          <Stepper
            label="Quiet after I am okay"
            value={tuning.standdown_cooldown_s}
            {...LIMITS.standdown_cooldown_s}
            format={(v) => (v >= 60 ? `${Math.round(v / 60)} min` : `${v}s`)}
            onChange={tune("standdown_cooldown_s")}
            note="How long the band ignores anomalies after you say you are okay. The SOS button always cuts through it."
          />
          <Toggle
            label="Pause alerts"
            note="Stops the band raising an alarm by itself. The night is still recorded and scored, the SOS button still works, and the siren still sounds when you ask for it. Use it while fitting the band or during a demo, and switch it back on before sleeping."
            on={tuning.anomaly_enabled === 0}
            onChange={(paused) => tune("anomaly_enabled")(paused ? 0 : 1)}
          />
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
            note="then the message goes out by itself"
          />
        </Section>

        <Section title="Emergency message">
          <OwnerName />
        </Section>

        <Section title="Device permissions">
          <PermissionRows />
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
