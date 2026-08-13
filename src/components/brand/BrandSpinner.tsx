import { cn } from "@/lib/cn";

/**
 * RePulse Brand Loading Spinner
 *
 * Inspired by WHOOP's minimalist circular loading emblem:
 * Features the signature vector 'R' glyph (monoline cut stroke)
 * centered inside a spinning amber ring.
 */
export function BrandSpinner({
  size = "md",
  label,
  color = "var(--color-pulse)",
  speedSec = 3.0,
  className,
}: {
  size?: "sm" | "md" | "lg" | "fullscreen";
  label?: string;
  color?: string;
  speedSec?: number;
  className?: string;
}) {
  const sizePixels = {
    sm: 40,
    md: 72,
    lg: 110,
    fullscreen: 88,
  }[size];

  const strokeWidth = size === "sm" ? 4 : 5;

  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: sizePixels, height: sizePixels }}
      >
        <svg
          viewBox="0 0 120 120"
          className="size-full overflow-visible"
          fill="none"
          role="progressbar"
          aria-label={label || "Loading..."}
        >
          {/* Smooth spinning arc ring — native SVG rotation for
              pixel-perfect centering without CSS transform-origin quirks */}
          <circle
            cx="60"
            cy="60"
            r="52"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray="327"
            strokeDashoffset="230"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 60 60"
              to="360 60 60"
              dur={`${speedSec}s`}
              repeatCount="indefinite"
            />
          </circle>

          {/* Centered Monoline RePulse 'R' Glyph */}
          <g
            transform="translate(47, 38) scale(0.44)"
            stroke="var(--color-ivory)"
            strokeWidth={8}
            strokeLinecap="butt"
          >
            {/* Stem */}
            <path d="M2 0V100" />
            {/* Bowl with cut */}
            <path d="M2 2H36A25 25 0 0 1 36 52H2" />
            {/* Detached leg */}
            <path d="M26 56L58 100" />
          </g>
        </svg>
      </div>

      {label && (
        <span className="label animate-pulse text-[var(--color-ash)]">
          {label}
        </span>
      )}
    </div>
  );

  if (size === "fullscreen") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-base)]">
        {content}
      </div>
    );
  }

  return content;
}
