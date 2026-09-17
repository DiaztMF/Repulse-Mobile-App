import { PageHeader } from "@/components/shell/PageHeader";
import { formatDuration } from "@/data/mock";
import { useStore } from "@/data/store";
import { METRIC_COLOR, BAND_COLOR } from "@/lib/metrics";
import { COPY } from "@/lib/copy";
import { screeningFlag, worstPosition } from "@/lib/screening";
import { RowList } from "@/components/vitals/VitalLayout";
import { NoNights } from "@/components/ui/NoNights";

/**
 * S3 — Breathing trend. Reports a pattern across nights, never a
 * condition: one night proves nothing, which is exactly why this screen
 * exists rather than a verdict on the nightly view.
 */
/** The sentence reads "while you were ___", so the words have to fit it. */
const POSITION_PHRASE: Record<string, string> = {
  supine: "on your back",
  left: "on your left side",
  right: "on your right side",
  prone: "face down",
};

export function BreathingTrend() {
  const WEEK = useStore().nights.slice(0, 7);

  /* A trend drawn from no nights is arithmetic on an empty list, and it
   * only ever had numbers to divide because a new account was handed the
   * synthetic fortnight. */
  if (WEEK.length === 0) {
    return (
      <div className="pb-8">
        <PageHeader title="Breathing trend" />
        <NoNights>A pattern needs several nights. None have been recorded yet.</NoNights>
      </div>
    );
  }

  /* The chart's own threshold: a night worth drawing in red. Deliberately
   * lower than the screening bar, because a dip is worth seeing long
   * before it is worth mentioning to a doctor. */
  const flagged = WEEK.filter((n) => n.breathing.desatPerHour >= 1);

  /* §8.2's bar, and nothing else. It wants three signals at once — enough
   * sleep, dips at five an hour, and snoring across a fifth of the night —
   * and this screen used to raise the sentence on one of them at a fifth
   * of the threshold. `screeningFlag` carries the real rule and its own
   * check file; the comment above it calls a false positive the thing that
   * sends someone to a doctor for nothing, which is precisely what a bar
   * set five times too low would have produced.
   *
   * Two nights, not one: this screen reports a pattern, and one night has
   * never been a pattern. */
  const screened = WEEK.filter((n) =>
    screeningFlag({
      desatPerHour: n.breathing.desatPerHour,
      snoreMinutes: n.breathing.snoreMin,
      sleepMinutes: n.sleep.durationMin - n.sleep.awake,
    }),
  );
  const snoring = WEEK.filter((n) => n.breathing.snoreMin >= 15);
  const worst = Math.max(...WEEK.map((n) => n.breathing.desatPerHour));
  const totalPos = WEEK.reduce(
    (a, n) => ({
      supine: a.supine + n.positions.supine,
      left: a.left + n.positions.left,
      right: a.right + n.positions.right,
      prone: a.prone + n.positions.prone,
    }),
    { supine: 0, left: 0, right: 0, prone: 0 },
  );
  const posTotal =
    totalPos.supine + totalPos.left + totalPos.right + totalPos.prone || 1;

  /* Which position the dips actually clustered in. This line used to say
   * "on your back" whatever the week held — a claim about a correlation
   * nobody had computed, on the screen where correlation is the whole
   * point. Now it is counted, and it stays off the screen entirely on a
   * week with no dips to attribute. */
  const dips = WEEK.flatMap((n) =>
    n.events.filter((e) => e.type === "desaturation" && e.position && e.position !== "unknown"),
  );
  const worstDipPosition = worstPosition(
    dips.map((e) => ({ from: 0, to: 0, lowest: 0, position: e.position! })),
  );

  return (
    <div className="pb-4">
      <PageHeader title="Breathing trend" />

      <div className="px-5">
        <p className="label mt-6 text-[var(--color-ash)]">Last 7 nights</p>
        <p className="num mt-2 text-[length:var(--text-hero)] leading-none">
          {flagged.length}
        </p>
        <p className="label mt-2 text-[var(--color-ash)]">
          {flagged.length === 1 ? "night with dips" : "nights with dips"}
        </p>

        {/* Per-night bars rather than an average: a single bad night in a
            calm fortnight is a different thing from a steady pattern, and
            an average hides which one this is.

            Bars and labels are separate rows — a percentage height needs
            a parent with a definite height, and a column that also holds
            its label does not have one. */}
        <div className="mt-10 flex h-24 items-end gap-2">
          {WEEK.slice().reverse().map((n) => {
            const flag = n.breathing.desatPerHour >= 1;
            return (
              <span
                key={n.date}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${Math.max(6, (n.breathing.desatPerHour / (worst || 1)) * 100)}%`,
                  background: flag ? BAND_COLOR.poor : METRIC_COLOR.breath,
                  opacity: flag ? 1 : 0.5,
                }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          {WEEK.slice().reverse().map((n) => (
            <span
              key={n.date}
              className="flex-1 text-center text-[length:var(--text-label)] text-[var(--color-ash-dim)]"
            >
              {new Date(n.date + "T12:00:00").toLocaleDateString("en-GB", {
                weekday: "narrow",
              })}
            </span>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3">
          {[
            { label: "Worst night", value: `${worst} /hr` },
            { label: "Nights snoring", value: `${snoring.length} of 7` },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-[var(--radius-control)] bg-[var(--color-surface)] p-4"
            >
              <p className="label text-[var(--color-ash)]">{m.label}</p>
              <p className="num mt-2 text-[length:var(--text-body)]">{m.value}</p>
            </div>
          ))}
        </div>

        <RowList
          title="Position across the week"
          rows={[
            { label: "On your back", value: formatDuration(totalPos.supine), level: totalPos.supine / posTotal, attention: true },
            { label: "Left side", value: formatDuration(totalPos.left), level: totalPos.left / posTotal },
            { label: "Right side", value: formatDuration(totalPos.right), level: totalPos.right / posTotal },
            { label: "Face down", value: formatDuration(totalPos.prone), level: totalPos.prone / posTotal },
          ]}
        />
        {worstDipPosition && (
          <p className="mt-3 text-[length:var(--text-meta)] text-[var(--color-ash)]">
            Most dips happened while you were {POSITION_PHRASE[worstDipPosition]}.
          </p>
        )}

        {screened.length >= 2 && (
          <div className="mt-10 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
            <p>{COPY.breathingScreening}</p>
          </div>
        )}

        <p className="label mt-8 text-center text-[var(--color-ash)]">
          {COPY.disclaimer}
        </p>
      </div>
    </div>
  );
}
