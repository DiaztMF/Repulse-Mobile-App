import { Waves, Wind, Volume2, Sun, AlertTriangle, Check, X } from "lucide-react";
import type { Night, NightEvent } from "@/data/mock";
import { METRIC_COLOR } from "@/lib/metrics";
import { cn } from "@/lib/cn";

const ICON = {
  comfort: Waves,
  desaturation: Wind,
  snore: Volume2,
  light_pollution: Sun,
  anomaly: AlertTriangle,
} as const;

const COLOR = {
  comfort: METRIC_COLOR.sleep,
  desaturation: METRIC_COLOR.breath,
  snore: METRIC_COLOR.breath,
  light_pollution: METRIC_COLOR.room,
  anomaly: METRIC_COLOR.pulse,
} as const;

const LABEL: Record<string, string> = {
  white_noise: "White noise",
  aroma: "Aroma",
  dim_light: "Dim light",
  cooling: "Cooling",
};

function clock(startMin: number, offset: number) {
  const t = (startMin + offset) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function Row({
  event,
  startMin,
  last,
}: {
  event: NightEvent;
  startMin: number;
  last: boolean;
}) {
  const Icon = ICON[event.type];
  const color = COLOR[event.type];

  return (
    <li className="grid grid-cols-[2rem_1fr] gap-x-4">
      <div className="flex flex-col items-center">
        {/* Dashed node marks an event rebuilt from the band buffer. A
            half-offline night is not the same quality as a watched one,
            and hiding that behind identical styling is a small lie. */}
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            event.offline
              ? "border border-dashed border-[var(--color-ash-dim)]"
              : "bg-[var(--color-raised)]",
          )}
          style={{ color }}
        >
          <Icon className="size-4" strokeWidth={1.5} />
        </span>
        {/* The rail connects events; after the last one it would
            point at nothing. */}
        {!last && <span className="w-px flex-1 bg-[var(--color-ash-dim)]/40" />}
      </div>

      <div className={last ? "pb-2" : "pb-6"}>
        <p className="num text-[length:var(--text-meta)] text-[var(--color-ash)]">
          {event.offline && "±"}
          {clock(startMin, event.at)}
        </p>
        <div className="mt-2 rounded-[var(--radius-control)] bg-[var(--color-surface)] p-4">
          <p className="text-[length:var(--text-card)]">{event.title}</p>

          {event.intervention && (
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[length:var(--text-meta)] text-[var(--color-ash)]">
              <span>{LABEL[event.intervention]}</span>
              {event.settleSec != null ? (
                <span className="flex items-center gap-1.5 text-[var(--color-pulse)]">
                  <Check className="size-3.5" strokeWidth={2.5} />
                  settled in {Math.floor(event.settleSec / 60)}m{" "}
                  {event.settleSec % 60}s
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <X className="size-3.5" strokeWidth={2.5} />
                  did not settle
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

/** The verification loop is visible here and nowhere else: trigger,
 *  intervention, and whether it worked, on one line. */
export function Timeline({ night, limit }: { night: Night; limit?: number }) {
  const events = limit ? night.events.slice(0, limit) : night.events;
  if (!events.length) return null;

  return (
    <ul className="mt-4">
      {events.map((e, i) => (
        <Row
          key={e.id}
          event={e}
          startMin={night.sleep.startMin}
          last={i === events.length - 1}
        />
      ))}
    </ul>
  );
}
