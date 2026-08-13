/**
 * Drawn as SVG paths, not typed in a font. The mark's character is its
 * deliberately interrupted strokes, and no font does that.
 *
 * Construction: uniform stroke, circular arcs only, flat terminals,
 * wide tracking. Cut only at joins the eye can complete, at most once
 * per letter — and not every letter gets one.
 *
 * Grid: cap height 100, baseline y=100.
 */

import { cn } from "@/lib/cn";

type Glyph = { advance: number; d: string[] };

const GLYPHS: Record<string, Glyph> = {
  // Leg detached from the bowl; small gap so it still connects visually.
  R: {
    advance: 64,
    d: [
      "M2 0V100",
      "M2 2H36A25 25 0 0 1 36 52H2",
      "M26 56L58 100",
    ],
  },
  // Floating middle bar — the signature cut.
  E: {
    advance: 58,
    d: ["M2 0V100", "M2 2H52", "M16 50H46", "M2 98H52"],
  },
  // Bowl detached from the stem at both ends.
  P: {
    advance: 64,
    d: ["M2 0V100", "M14 2H36A25 25 0 0 1 36 52H14"],
  },
  // Left stem stops short of the curve.
  U: {
    advance: 66,
    d: ["M2 0V60", "M2 70A29 30 0 0 0 60 70", "M60 0V70"],
  },
  // No cut, on purpose. A floating bar needs two stems bracketing it
  // for the eye to complete it; L has only one, so a cut here reads
  // as two separate marks.
  L: {
    advance: 52,
    d: ["M2 0V98H50"],
  },
  // Gap at the middle inflection, wide enough to read as intentional.
  S: {
    advance: 60,
    d: [
      "M56 20C56 8 44 2 30 2C16 2 4 14 4 26C4 38 14 46 26 46",
      "M34 54C46 54 56 62 56 74C56 86 44 98 30 98C16 98 4 92 4 80",
    ],
  },
};

const LETTERS = "REPULSE".split("");
const TRACKING = 26;

function layout() {
  let x = 0;
  const out: { d: string[]; x: number }[] = [];
  for (const ch of LETTERS) {
    const g = GLYPHS[ch]!;
    out.push({ d: g.d, x });
    x += g.advance + TRACKING;
  }
  return { glyphs: out, width: x - TRACKING };
}

export function Wordmark({
  className,
  stroke = "var(--color-ivory)",
  /** Drawn fraction 0-1, for static states. Ignored when animating. */
  progress = 1,
  /** Self-draws via CSS keyframes; needs no JS tick. */
  animate = false,
  /** viewBox units. Raise it at small sizes — stroke scales with the
   *  SVG and drops below a pixel around 120px wide. */
  strokeWidth = 4,
}: {
  className?: string;
  stroke?: string;
  progress?: number;
  animate?: boolean;
  strokeWidth?: number;
}) {
  const { glyphs, width } = layout();

  return (
    <svg
      viewBox={`-2 -2 ${width + 4} 104`}
      className={cn(animate && "wordmark-draw", className)}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      role="img"
      aria-label="RePulse"
    >
      {glyphs.map((g, i) => (
        <g key={i} transform={`translate(${g.x} 0)`}>
          {g.d.map((d, j) => (
            <path
              key={j}
              d={d}
              pathLength={1}
              strokeDasharray={1}
              style={animate ? undefined : { strokeDashoffset: 1 - progress }}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
