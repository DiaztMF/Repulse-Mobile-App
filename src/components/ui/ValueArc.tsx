import { cn } from "@/lib/cn";

/**
 * An open arc, not a closed ring. A ring says "there is a quota to
 * fill" — true for calories, wrong for a sleep score. An arc says
 * "here is where you sit in a range", which is what we actually show.
 */
export function ValueArc({
  value,
  min = 0,
  max = 100,
  color = "var(--color-pulse)",
  className,
}: {
  value: number | null;
  min?: number;
  max?: number;
  color?: string;
  className?: string;
}) {
  const W = 320;
  const H = 84;
  const d = `M 8 ${H - 8} Q ${W / 2} -18 ${W - 8} ${H - 8}`;

  const ratio =
    value === null ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));

  return (
    <div className={cn("relative w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" fill="none" aria-hidden>
        <path
          d={d}
          stroke="var(--color-faint)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {value !== null && (
          <path
            d={d}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - ratio}
            style={{ transition: "stroke-dashoffset 600ms var(--ease-light)" }}
          />
        )}
        {[0.25, 0.5, 0.75].map((t) => {
          const x = 8 + (W - 16) * t;
          const y = H - 8 + (-18 - (H - 8)) * 2 * t * (1 - t) * 2;
          return (
            <circle key={t} cx={x} cy={y} r={2} fill="var(--color-ash-dim)" />
          );
        })}
      </svg>

      <div className="absolute inset-x-2 bottom-0 flex justify-between">
        <span className="label text-[var(--color-ash)]">{min}</span>
        <span className="label text-[var(--color-ash)]">{max}</span>
      </div>
    </div>
  );
}
