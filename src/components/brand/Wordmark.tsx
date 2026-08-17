/**
 * Drawn as SVG paths, not typed in a font. The mark's character is its
 * deliberately interrupted strokes, and no font does that.
 *
 * The geometry lives in `glyphs.ts` because the splash images are generated
 * from the same paths.
 */

import { cn } from "@/lib/cn";
import { VIEW_BOX, layout } from "./glyphs";

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
      viewBox={`${VIEW_BOX.x} ${VIEW_BOX.y} ${width + 4} ${VIEW_BOX.height}`}
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
