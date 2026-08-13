import { cn } from "@/lib/cn";

/** Segments, not dots — dots don't tell you how long the road is. */
export function StepBar({
  total,
  current,
  className,
}: {
  total: number;
  current: number; // 1-indexed
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1.5", className)} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-0.5 flex-1 rounded-full",
            i < current
              ? "bg-[var(--color-ivory)]"
              : "bg-[var(--color-ash-dim)]/30",
          )}
        />
      ))}
    </div>
  );
}
