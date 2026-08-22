/** Bare trace, no axes or grid. On a card the shape is the message; a
 *  chart frame would cost more room than the information is worth. */
/** Averaged into buckets before drawing. A night is hundreds of samples
 *  wide but a card is a few hundred pixels — drawing every point renders
 *  the noise, not the shape. */
function bucket(values: number[], count: number) {
  if (values.length <= count) return values;
  const size = values.length / count;
  return Array.from({ length: count }, (_, i) => {
    const slice = values.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

/** Trimmed to the shortest reading that is still true: 62, 4.5, 0.3. */
const fmt = (v: number) =>
  Math.abs(v) >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1);

export function Sparkline({
  values: raw,
  color = "var(--color-pulse)",
  height = 40,
  points = 72,
  unit,
}: {
  values: number[];
  color?: string;
  height?: number;
  points?: number;
  /** Naming the unit turns the trace into a chart: the range appears down
   *  the side and the night appears along the bottom.
   *
   *  Without it the line is drawn bare, which is right on a card where
   *  the shape is the whole message. On a screen someone opens to read a
   *  number it is not: the y range is fitted to the data, so a two-bpm
   *  wobble and a forty-bpm swing draw the identical mountain. A reader
   *  cannot tell those apart, and nothing else on the screen tells them.
   *  Leaving the axis off does not make the chart modest, it makes it
   *  unreadable. */
  unit?: string;
}) {
  /* Nothing to draw is a state worth naming. This returned null, which
   * left a silent gap exactly where a chart belongs — and a reader who
   * cannot tell "no data" from "a chart that failed to load" will assume
   * the second. A measured night has no per-minute series yet, so this
   * is now the normal case, not an edge one. */
  if (raw.length < 2) {
    return (
      <div className="grid place-items-center" style={{ height }}>
        <p className="label text-[var(--color-ash)]">
          No minute-by-minute data for this night
        </p>
      </div>
    );
  }

  const values = bucket(raw, points);
  const W = 300;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const trace = (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="w-full"
      height={height}
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={d} stroke={color} strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );

  if (!unit) return trace;

  return (
    <figure
      role="img"
      aria-label={`${fmt(min)} to ${fmt(max)} ${unit}, across the night`}
    >
      <div className="flex gap-3">
        {/* Beside the trace rather than over it: a label on top of the
            line hides the very shape it is describing. */}
        <div
          className="label flex shrink-0 flex-col justify-between text-right text-[var(--color-ash-dim)]"
          style={{ height }}
        >
          <span>{fmt(max)}</span>
          <span>{fmt(min)}</span>
        </div>
        <div className="min-w-0 flex-1">{trace}</div>
      </div>

      <figcaption className="label mt-2 flex justify-between text-[var(--color-ash-dim)]">
        <span>Asleep</span>
        <span>{unit}</span>
        <span>Awake</span>
      </figcaption>
    </figure>
  );
}
