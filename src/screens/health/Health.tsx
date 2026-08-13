import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Wind, Sparkles, AlertTriangle, Moon, Menu } from "lucide-react";
import { Drawer } from "@/components/shell/Drawer";
import { NIGHTS, formatDuration, bandOfScore } from "@/data/mock";
import { BAND_COLOR, BAND_LABEL, METRIC_COLOR } from "@/lib/metrics";

function shortDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * S1 — History, and the way into the two long-range screens. Those two
 * sit above the list because a fortnight of nights is where the product
 * actually says something; a scroll of individual scores is not.
 */
export function Health() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const nightsWithBreathing = NIGHTS.filter((n) => n.breathing.desatPerHour >= 1);

  return (
    <div className="pb-4">
      <header className="safe-t flex h-14 items-center gap-4 px-5">
        <button onClick={() => setMenu(true)} aria-label="Menu">
          <Menu className="size-6" strokeWidth={1.5} />
        </button>
        <h1 className="label text-[var(--color-ivory)]">Health</h1>
      </header>
      <Drawer open={menu} onClose={() => setMenu(false)} />

      <div className="space-y-3 px-5 pt-2">
        <button
          onClick={() => navigate("/health/insights")}
          className="flex w-full items-center gap-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 text-left"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-raised)]">
            <Sparkles className="size-5" strokeWidth={1.5} style={{ color: METRIC_COLOR.pulse }} />
          </span>
          <span className="flex-1">
            <span className="block text-[length:var(--text-card)] font-medium">
              What helps you settle
            </span>
            <span className="block text-[length:var(--text-meta)] text-[var(--color-ash)]">
              Scored across 14 nights
            </span>
          </span>
          <ChevronRight className="size-5 text-[var(--color-ash)]" strokeWidth={1.5} />
        </button>

        <button
          onClick={() => navigate("/health/breathing")}
          className="flex w-full items-center gap-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 text-left"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-raised)]">
            <Wind className="size-5" strokeWidth={1.5} style={{ color: METRIC_COLOR.breath }} />
          </span>
          <span className="flex-1">
            <span className="block text-[length:var(--text-card)] font-medium">
              Breathing trend
            </span>
            <span className="block text-[length:var(--text-meta)] text-[var(--color-ash)]">
              {nightsWithBreathing.length} of 14 nights with dips
            </span>
          </span>
          <ChevronRight className="size-5 text-[var(--color-ash)]" strokeWidth={1.5} />
        </button>
      </div>

      <h2 className="mt-10 px-5 text-[length:var(--text-card)] font-medium">
        Nights
      </h2>

      <ul className="mt-4 space-y-3 px-5">
        {NIGHTS.map((n) => {
          const band = n.score !== null ? bandOfScore(n.score) : null;
          return (
            <li key={n.date}>
              <button
                onClick={() => navigate(`/health/night/${n.date}`)}
                className="flex w-full items-center gap-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 text-left"
              >
                <span className="w-14 shrink-0">
                  <span
                    className="num block text-[length:var(--text-metric)] leading-none"
                    style={{ color: band ? BAND_COLOR[band] : "var(--color-ash-dim)" }}
                  >
                    {n.score ?? "—"}
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block">{shortDate(n.date)}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--text-meta)] text-[var(--color-ash)]">
                    {n.score !== null ? (
                      <>
                        <span>{formatDuration(n.sleep.durationMin)}</span>
                        <span>{n.counts.restless} restless</span>
                        {n.light.pollutionMin <= 25 && (
                          <span className="flex items-center gap-1">
                            <Moon className="size-3" strokeWidth={2} />
                            dark
                          </span>
                        )}
                        {n.counts.anomaly > 0 && (
                          <span
                            className="flex items-center gap-1"
                            style={{ color: BAND_COLOR.poor }}
                          >
                            <AlertTriangle className="size-3" strokeWidth={2} />
                            anomaly
                          </span>
                        )}
                      </>
                    ) : (
                      <span>Band not worn</span>
                    )}
                  </span>
                </span>

                <span className="label shrink-0" style={{ color: band ? BAND_COLOR[band] : "var(--color-ash-dim)" }}>
                  {band ? BAND_LABEL[band] : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
