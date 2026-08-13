import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useStore } from "@/data/store";
import { seriesFor } from "@/data/mock";

const RANGES = [
  { key: "last", label: "Last night", nights: 1 },
  { key: "week", label: "Last 7 nights", nights: 7 },
  { key: "all", label: "All 14 nights", nights: 14 },
];

const PARTS = [
  { key: "summary", label: "Night summaries", mbPerNight: 0.002 },
  { key: "events", label: "Events and intervention results", mbPerNight: 0.004 },
  { key: "series", label: "Time series, one sample per 5s", mbPerNight: 0.09 },
  { key: "ecg", label: "ECG recordings", mbPerNight: 0.015 },
];

/** One block per section, each with its own header row. A single flat
 *  sheet cannot hold three different shapes without inventing columns. */
function toCsv(parts: Record<string, unknown>) {
  const out: string[] = [];
  for (const [name, rows] of Object.entries(parts)) {
    const list = rows as Record<string, unknown>[];
    if (!Array.isArray(list) || !list.length) continue;
    out.push(`# ${name}`);
    const flat = list.map((r) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [
          k,
          v !== null && typeof v === "object" ? JSON.stringify(v) : v,
        ]),
      ),
    );
    const cols = [...new Set(flat.flatMap((r) => Object.keys(r)))];
    out.push(cols.join(","));
    for (const r of flat)
      out.push(cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","));
    out.push("");
  }
  return out.join(String.fromCharCode(10));
}

/**
 * D6 — Export. The one place health data leaves the app's protection, so
 * the size is shown before the tap rather than discovered after it.
 */
export function Export() {
  const { nights } = useStore();
  const [range, setRange] = useState("week");
  const [done, setDone] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({
    summary: true,
    events: true,
    series: true,
  });
  const [json, setJson] = useState(false);

  const count = RANGES.find((r) => r.key === range)!.nights;
  const mb = PARTS.reduce((a, p) => a + (picked[p.key] ? p.mbPerNight * count : 0), 0);

  /** Built in the browser and handed straight to the download. No server
   *  touches this, which is the point: the file is health data. */
  const run = () => {
    const chosen = nights.slice(0, count);
    const parts: Record<string, unknown> = {};
    if (picked.summary) parts.nights = chosen.map(({ events: _events, ...rest }) => rest);
    if (picked.events)
      parts.events = chosen.flatMap((n) =>
        n.events.map((e) => ({ date: n.date, ...e })),
      );
    if (picked.series)
      parts.series = chosen.map((n) => ({ date: n.date, samples: seriesFor(n.date) }));

    const name = `repulse-${chosen.at(-1)?.date ?? "export"}-to-${chosen[0]?.date ?? ""}`;
    const blob = json
      ? new Blob([JSON.stringify(parts, null, 2)], { type: "application/json" })
      : new Blob([toCsv(parts)], { type: "text/csv" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.${json ? "json" : "csv"}`;
    a.click();
    URL.revokeObjectURL(url);
    setDone(`${a.download} saved`);
  };

  return (
    <div className="pb-8">
      <PageHeader title="Export" />

      <div className="px-5">
        <h2 className="label text-[var(--color-ash)]">Range</h2>
        <div className="mt-3 space-y-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-[var(--radius-control)] px-4 py-3.5 text-left",
                range === r.key ? "bg-[var(--color-raised)]" : "bg-[var(--color-surface)]",
              )}
            >
              <span
                className={cn(
                  "size-4 rounded-full border",
                  range === r.key
                    ? "border-[var(--color-pulse)] bg-[var(--color-pulse)]"
                    : "border-[var(--color-ash-dim)]",
                )}
              />
              {r.label}
            </button>
          ))}
        </div>

        <h2 className="label mt-8 text-[var(--color-ash)]">Contents</h2>
        <div className="mt-3 space-y-2">
          {PARTS.map((p) => (
            <label
              key={p.key}
              className="flex items-center gap-3 rounded-[var(--radius-control)] bg-[var(--color-surface)] px-4 py-3.5"
            >
              <input
                type="checkbox"
                checked={!!picked[p.key]}
                onChange={(e) => setPicked((s) => ({ ...s, [p.key]: e.target.checked }))}
                className="size-4 accent-[var(--color-pulse)]"
              />
              <span>{p.label}</span>
            </label>
          ))}
        </div>

        <h2 className="label mt-8 text-[var(--color-ash)]">Format</h2>
        <div className="mt-3 flex gap-2">
          {[false, true].map((v) => (
            <button
              key={String(v)}
              onClick={() => setJson(v)}
              className={cn(
                "label flex-1 rounded-[var(--radius-pill)] border py-3",
                json === v
                  ? "border-[var(--color-pulse)] text-[var(--color-pulse)]"
                  : "border-[var(--color-ash-dim)] text-[var(--color-ash)]",
              )}
            >
              {v ? "JSON" : "CSV"}
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-baseline justify-between">
          <span className="text-[var(--color-ash)]">Estimated size</span>
          <span className="num">{mb < 1 ? `${Math.round(mb * 1000)} KB` : `${mb.toFixed(1)} MB`}</span>
        </div>

        <p className="mt-6 text-[length:var(--text-meta)] text-[var(--color-ash)]">
          This file holds your health data. Once it is saved, the app's
          protections no longer apply to it.
        </p>

        <Button
          size="lg"
          register="system"
          className="mt-6"
          disabled={mb === 0}
          onClick={run}
        >
          Export
        </Button>
        {done && (
          <p className="label mt-4 text-center text-[var(--color-ash)]">{done}</p>
        )}
      </div>
    </div>
  );
}
