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

export function Sparkline({
  values: raw,
  color = "var(--color-pulse)",
  height = 40,
  points = 72,
}: {
  values: number[];
  color?: string;
  height?: number;
  points?: number;
}) {
  if (raw.length < 2) return null;

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

  return (
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
}
