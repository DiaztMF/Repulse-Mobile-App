/** One PQRST cycle. Repeated and scrolled rather than redrawn, so the
 *  motion costs a single transform. */
const BEAT = "M0 20 L10 20 Q13 15 16 20 L21 20 L24 20 L26 7 L29 33 L32 20 L41 20 Q47 13 53 20 L60 20";
const W = 60;
const COUNT = 24;

/**
 * The only perpetual animation in the app. Repeated motion on a screen
 * lit in a dark bedroom pulls the eye of someone trying to sleep, so
 * everything else stays still. This one earns it: it moves because the
 * body it represents is moving.
 */
export function EcgTrace({ height = 44 }: { height?: number }) {
  return (
    <div className="relative overflow-hidden" style={{ height }}>
      <svg
        viewBox={`0 0 ${W * COUNT} 40`}
        height={height}
        preserveAspectRatio="none"
        fill="none"
        className="ecg-scroll absolute left-0 top-0"
        style={{ width: `${W * COUNT * 2}px` }}
        aria-hidden
      >
        {Array.from({ length: COUNT }, (_, i) => (
          <path
            key={i}
            d={BEAT}
            transform={`translate(${i * W} 0)`}
            stroke="var(--color-pulse)"
            strokeWidth={1.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}
