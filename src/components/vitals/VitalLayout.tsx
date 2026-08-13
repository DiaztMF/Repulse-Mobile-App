import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { useStore } from "@/data/store";
import { cn } from "@/lib/cn";

export type KeyMetric = { label: string; value: string; note?: string };

export type Row = {
  label: string;
  value: string;
  /** 0-1. Drives the bar under the row. */
  level: number;
  /** Coloured only when it needs attention — that is what makes the
   *  colour mean something when it does appear. */
  attention?: boolean;
};

/** Previous and next days peek at the edges. A full calendar would be
 *  wrong for a screen people open to see last night.
 *
 *  An arrow is only offered when a night exists on that side — a control
 *  that moves nowhere is worse than no control. */
function DateStrip({
  date,
  onChange,
}: {
  date: string;
  onChange: (d: string) => void;
}) {
  const { nights } = useStore();
  const i = nights.findIndex((n) => n.date === date);
  const older = i >= 0 ? nights[i + 1] : undefined;
  const newer = i > 0 ? nights[i - 1] : undefined;

  const fmt = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  return (
    <div className="flex items-center justify-between gap-4 px-5">
      <button
        disabled={!older}
        onClick={() => older && onChange(older.date)}
        className="flex items-center gap-1 truncate text-[length:var(--text-meta)] text-[var(--color-ash-dim)] disabled:opacity-0"
      >
        <ChevronLeft className="size-4 shrink-0" strokeWidth={1.5} />
        {older ? fmt(older.date) : ""}
      </button>

      <span className="border-b border-[var(--color-ivory)] pb-1 text-[length:var(--text-body)]">
        {fmt(date)}
      </span>

      <button
        disabled={!newer}
        onClick={() => newer && onChange(newer.date)}
        className="flex items-center gap-1 truncate text-[length:var(--text-meta)] text-[var(--color-ash-dim)] disabled:opacity-0"
      >
        {newer ? fmt(newer.date) : ""}
        <ChevronRight className="size-4 shrink-0" strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function MetricGrid({ items }: { items: KeyMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((m) => (
        <div
          key={m.label}
          className="rounded-[var(--radius-control)] bg-[var(--color-surface)] p-4"
        >
          <p className="label text-[var(--color-ash)]">{m.label}</p>
          <p className="num mt-2 text-[length:var(--text-body)]">{m.value}</p>
          {m.note && (
            <p className="mt-1 text-[length:var(--text-meta)] text-[var(--color-ash)]">
              {m.note}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function RowList({ title, rows }: { title: string; rows: Row[] }) {
  if (!rows.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-[length:var(--text-card)] font-medium">{title}</h2>
      <ul className="mt-5 space-y-6">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-baseline justify-between gap-4">
              <span>{r.label}</span>
              <span
                className={cn(
                  "num text-[length:var(--text-body)]",
                  r.attention
                    ? "text-[var(--color-band-poor)]"
                    : "text-[var(--color-ash)]",
                )}
              >
                {r.value}
              </span>
            </div>
            <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-[var(--color-faint)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(Math.min(1, Math.max(0, r.level)) * 100)}%`,
                  background: r.attention
                    ? "var(--color-band-poor)"
                    : "var(--color-ivory)",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Shared frame for all five vital screens. What changes per metric is
 *  the headline number, the chart and the rows — never the structure,
 *  so moving between them costs no re-reading. */
export function VitalLayout({
  title,
  date,
  onDate,
  value,
  unit,
  caption,
  chart,
  metrics,
  children,
  footnote,
}: {
  title: string;
  date: string;
  onDate: (d: string) => void;
  value: string;
  unit: string;
  caption?: string;
  chart?: ReactNode;
  metrics?: KeyMetric[];
  children?: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <div className="pb-4">
      <PageHeader
        title={title}
        right={<Info className="size-5 text-[var(--color-ash)]" strokeWidth={1.5} />}
      />

      <DateStrip date={date} onChange={onDate} />

      <div className="px-5">
        <p className="num mt-8 text-[length:var(--text-hero)] leading-none">
          {value}
        </p>
        <p className="label mt-2 text-[var(--color-ash)]">{unit}</p>
        {caption && <p className="mt-4 text-[var(--color-ash)]">{caption}</p>}

        {chart && <div className="mt-8">{chart}</div>}

        {metrics && metrics.length > 0 && (
          <div className="mt-10">
            <MetricGrid items={metrics} />
          </div>
        )}

        {children}

        {footnote && <div className="mt-10">{footnote}</div>}
      </div>
    </div>
  );
}
