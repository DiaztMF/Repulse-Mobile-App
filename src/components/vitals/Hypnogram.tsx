import type { Night } from "@/data/mock";
import { formatDuration } from "@/data/mock";
import { METRIC_COLOR } from "@/lib/metrics";

/** Stacked proportions rather than a stage-by-stage plot. The mix is the
 *  readable part; a minute-level hypnogram implies a precision that
 *  wrist PPG does not have. */
export function Hypnogram({ n }: { n: Night["sleep"] }) {
  const parts = [
    { k: "Deep", v: n.deep, o: 1 },
    { k: "REM", v: n.rem, o: 0.72 },
    { k: "Light", v: n.light, o: 0.45 },
    { k: "Awake", v: n.awake, o: 0.2 },
  ];
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        {parts.map((p) => (
          <span
            key={p.k}
            style={{
              width: `${(p.v / n.durationMin) * 100}%`,
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
    </div>
  );
}
