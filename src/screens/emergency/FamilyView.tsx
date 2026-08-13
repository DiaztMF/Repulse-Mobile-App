import { PageHeader } from "@/components/shell/PageHeader";
import { formatDuration, bandOfScore } from "@/data/mock";
import { useLastNight } from "@/data/store";
import { BAND_COLOR, BAND_LABEL } from "@/lib/metrics";
import { COPY } from "@/lib/copy";

const WHO = "Sari";

const ALERTS = [
  { when: "8 Aug, 02:16", what: "Irregular pulse", outcome: "Cancelled by movement" },
];

/**
 * X4 — Viewing someone else. A separate screen rather than the owner's
 * home with fields hidden: a viewer must never reach the raw series, and
 * one purpose-built read-only screen is safer than auditing every field
 * of every screen for leaks.
 */
export function FamilyView() {
  const n = useLastNight();
  const band = n.score !== null ? bandOfScore(n.score) : null;

  return (
    <div className="pb-8">
      <PageHeader title={`Viewing ${WHO}`} />

      <div className="px-5">
        <p className="label text-[var(--color-ash)]">Last night</p>

        {band ? (
          <>
            <p className="num mt-3 text-[length:var(--text-hero)] leading-none">
              {n.score}
            </p>
            <p className="label mt-2" style={{ color: BAND_COLOR[band] }}>
              Sleep Score · {BAND_LABEL[band]}
            </p>
            <p className="mt-6 text-[var(--color-ash)]">
              {WHO} slept {formatDuration(n.sleep.durationMin)} with{" "}
              {n.counts.restless} restless spells.
            </p>
          </>
        ) : (
          <p className="mt-4 text-[var(--color-ash)]">
            No band data was recorded last night.
          </p>
        )}

        <h2 className="label mt-12 text-[var(--color-ash)]">Alert history</h2>
        <ul className="mt-3 space-y-2">
          {ALERTS.map((a) => (
            <li
              key={a.when}
              className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5"
            >
              <p className="num text-[length:var(--text-meta)] text-[var(--color-ash)]">
                {a.when}
              </p>
              <p className="mt-2">{a.what}</p>
              <p className="mt-1 text-[length:var(--text-meta)] text-[var(--color-ash)]">
                {a.outcome}
              </p>
            </li>
          ))}
        </ul>

        {/* Says what this view is, so nobody mistakes a summary for the
            whole picture. */}
        <p className="mt-10 text-[length:var(--text-meta)] text-[var(--color-ash)]">
          You see summaries and alerts only. Detailed readings stay with {WHO}.
        </p>

        <p className="label mt-8 text-center text-[var(--color-ash)]">
          {COPY.disclaimer}
        </p>
      </div>
    </div>
  );
}
