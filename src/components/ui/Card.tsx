import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MetricKey } from "@/lib/metrics";
import { METRIC_COLOR } from "@/lib/metrics";

/**
 * Uniform anatomy for every feed card. No border and no shadow —
 * in the dark a border is noise, so depth comes from color instead.
 */
export function Card({
  metric,
  icon,
  title,
  status,
  onOpen,
  children,
  className,
}: {
  metric: MetricKey;
  icon?: ReactNode;
  title: string;
  status?: string;
  onOpen?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  const color = METRIC_COLOR[metric];

  return (
    <section
      onClick={onOpen}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] p-5",
        "bg-[var(--color-surface)]",
        className,
      )}
    >
      {/* 4% tint — enough to separate domains, not enough to read as color */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 100% at 0% 0%, ${color}0A, transparent 60%)`,
        }}
      />

      <header className="relative flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-raised)]"
          style={{ color }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[length:var(--text-card)] font-medium">{title}</h2>
          {status && (
            <p className="label mt-0.5" style={{ color }}>
              {status}
            </p>
          )}
        </div>
        {onOpen && (
          <ChevronRight
            className="mt-2 size-5 shrink-0 text-[var(--color-ash)]"
            strokeWidth={1.5}
          />
        )}
      </header>

      {children && <div className="relative mt-4">{children}</div>}
    </section>
  );
}

/** Empty states name the number that's missing. No illustrations. */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-control)] border border-dashed border-[var(--color-ash-dim)]/50 p-4 text-[var(--color-ash)]">
      {children}
    </p>
  );
}
