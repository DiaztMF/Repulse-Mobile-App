import type { Night } from "@/data/mock";
import { formatDuration } from "@/data/mock";
import { METRIC_COLOR } from "@/lib/metrics";

/** Stacked proportions rather than a stage-by-stage plot. The mix is the
 *  readable part; a minute-level hypnogram implies a precision that
 *  wrist PPG does not have.
 *
 *  On a measured night it does not have the stages at all. Deep, light,
 *  and REM come from brain activity and this band has no route to it, so
 *  they arrive null and the bar falls back to the split that really was
 *  measured: still against moving. Saying so costs one line and is the
 *  difference between a simpler chart and a fabricated one. */
export function Hypnogram({ n }: { n: Night["sleep"] }) {
  const staged = n.deep != null && n.rem != null && n.light != null;

  const parts = staged
    ? [
        { k: "Deep", v: n.deep!, o: 1 },
        { k: "REM", v: n.rem!, o: 0.72 },
        { k: "Light", v: n.light!, o: 0.45 },
        { k: "Awake", v: n.awake, o: 0.2 },
      ]
    : [
        { k: "Asleep", v: Math.max(0, n.durationMin - n.awake), o: 0.75 },
        { k: "Awake", v: n.awake, o: 0.2 },
      ];

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        {parts.map((p) => (
          <span
            key={p.k}
            style={{
              width: n.durationMin > 0 ? `${(p.v / n.durationMin) * 100}%` : "0%",
              background: METRIC_COLOR.sleep,
              opacity: p.o,
            }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {parts.map((p) => (
          <span key={p.k} className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ background: METRIC_COLOR.sleep, opacity: p.o }}
            />
            <span className="text-[length:var(--text-meta)] text-[var(--color-ash)]">
              {p.k} {formatDuration(p.v)}
            </span>
          </span>
        ))}
      </div>
      {!staged && (
        <p className="mt-3 text-[length:var(--text-meta)] text-[var(--color-ash-dim)]">
          Sleep stages need brain activity. This band measures the wrist, so it
          reports time asleep and time awake instead.
        </p>
      )}
    </div>
  );
}
