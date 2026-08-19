/** One pulse cycle as a MAX30102 actually sees it: a steep systolic
 *  upstroke, a rounded peak, the dicrotic notch where the aortic valve
 *  shuts, then a slow decay. Repeated and scrolled rather than redrawn,
 *  so the motion costs a single transform.
 *
 *  Deliberately not PQRST. There is no AD8232 in the band — the shape of
 *  an electrocardiogram drawn from an optical sensor would be a
 *  measurement this hardware cannot make, presented as one it did. */
const BEAT =
  "M0 34 L6 34 C8 26 10 10 13 6 C16 3 18 10 20 16 C21 19 22 20 23 20 C25 17 27 15 29 17 C31 19 33 24 36 28 C40 33 44 34 48 34 L60 34";
const W = 60;
const COUNT = 24;

/**
 * The only perpetual animation in the app. Repeated motion on a screen
 * lit in a dark bedroom pulls the eye of someone trying to sleep, so
 * everything else stays still. This one earns it: it moves because the
 * body it represents is moving.
 */
export function PulseTrace({ height = 44 }: { height?: number }) {
  return (
    <div className="relative overflow-hidden" style={{ height }}>
      <svg
        viewBox={`0 0 ${W * COUNT} 40`}
        height={height}
        preserveAspectRatio="none"
        fill="none"
        className="pulse-scroll absolute left-0 top-0"
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
