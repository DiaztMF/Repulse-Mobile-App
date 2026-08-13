import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useStore } from "@/data/store";
import { BAND_COLOR } from "@/lib/metrics";

/** Below this a rate is noise, so the app refuses to act on it or to
 *  present it as a score. */
const MIN_TRIES = 3;

/**
 * S4 — Intervention insights. The only screen that shows the learning
 * loop actually working, which is why it is the last thing that would
 * ever be cut.
 */
export function Insights() {
  const navigate = useNavigate();
  const { interventions: INTERVENTIONS } = useStore();

  const ranked = [...INTERVENTIONS].sort((a, b) => {
    const ra = a.tries >= MIN_TRIES ? a.success / a.tries : -1;
    const rb = b.tries >= MIN_TRIES ? b.success / b.tries : -1;
    return rb - ra;
  });
  const best = ranked.find((i) => i.tries >= MIN_TRIES);

  return (
    <div className="pb-4">
      <header className="safe-t grid h-14 grid-cols-[auto_1fr_auto] items-center px-5">
        <button onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft className="size-6" strokeWidth={1.5} />
        </button>
        <span className="label text-center text-[var(--color-ivory)]">
          What helps you settle
        </span>
        <span className="w-6" />
      </header>

      <div className="px-5">
        <p className="mt-6 text-[var(--color-ash)]">
          Every time you get restless, RePulse tries one thing and records
          whether you settled. After a few tries it starts picking the one that
          works for you.
        </p>

        <ul className="mt-10 space-y-8">
          {ranked.map((i) => {
            const enough = i.tries >= MIN_TRIES;
            const rate = enough ? i.success / i.tries : 0;
            return (
              <li key={i.key}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[length:var(--text-card)]">{i.label}</span>
                  {enough ? (
                    <span className="num text-[length:var(--text-body)]">
                      {Math.round(rate * 100)}%
                    </span>
                  ) : (
                    <span className="label text-[var(--color-ash-dim)]">
                      {i.tries} of {MIN_TRIES}
                    </span>
                  )}
                </div>

                <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-[var(--color-faint)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(rate * 100)}%`,
                      background: BAND_COLOR.good,
                    }}
                  />
                </div>

                <p className="mt-2 text-[length:var(--text-meta)] text-[var(--color-ash)]">
                  {enough
                    ? `${i.success} of ${i.tries} tries · settled in ${Math.floor(i.avgSettleSec / 60)}m ${i.avgSettleSec % 60}s on average`
                    : // Said plainly rather than shown as a low score — a
                      // rate from one try is not a low rate, it is no rate.
                      `Not enough tries yet to trust a number.`}
                </p>
              </li>
            );
          })}
        </ul>

        {best && (
          <section className="mt-12 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5">
            <p className="label text-[var(--color-ash)]">Next time</p>
            <p className="mt-2 text-[length:var(--text-card)]">
              {best.label} will be tried first.
            </p>
            <p className="mt-2 text-[var(--color-ash)]">
              It settled you {best.success} times out of {best.tries}, faster
              than the others.
            </p>
            <p className="mt-4 text-[length:var(--text-meta)] text-[var(--color-ash-dim)]">
              Roughly one night in five it tries something else instead, so a
              better option is not missed just because it was tested late.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
