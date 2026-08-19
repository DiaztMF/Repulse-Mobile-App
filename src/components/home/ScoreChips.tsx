import { NavLink } from "react-router-dom";
import { Moon, HeartPulse, Wind, Waves, Home, SlidersHorizontal } from "lucide-react";
import type { Night } from "@/data/mock";
import { METRIC_COLOR } from "@/lib/metrics";

/**
 * Deliberately overflows the right edge. That clipped chip is what tells
 * the user the row scrolls — fitting five chips to the screen width
 * removes the only affordance it has.
 */
export function ScoreChips({ night }: { night: Night }) {
  const chips = [
    { to: "/vitals/sleep", label: "Sleep", Icon: Moon, color: METRIC_COLOR.sleep, value: night.score ?? "—" },
    { to: "/vitals/pulse", label: "Pulse", Icon: HeartPulse, color: METRIC_COLOR.pulse, value: night.score ? night.heart.avg : "—" },
    { to: "/vitals/breathing", label: "SpO₂", Icon: Wind, color: METRIC_COLOR.breath, value: night.score ? `${night.breathing.spo2DeltaPct}%` : "—" },
    { to: "/vitals/movement", label: "Restless", Icon: Waves, color: METRIC_COLOR.sleep, value: night.score ? night.counts.restless : "—" },
    { to: "/vitals/room", label: "Room", Icon: Home, color: METRIC_COLOR.room, value: night.room.tempC != null ? `${night.room.tempC}°` : "—" },
  ];

  return (
    <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5">
      {chips.map(({ to, label, Icon, color, value }) => (
        <NavLink key={to} to={to} className="flex shrink-0 flex-col items-center gap-2">
          <span
            className="flex size-16 flex-col items-center justify-center rounded-full border bg-[var(--color-surface)]"
            // 30% of the metric colour. `color` is a var() now, so the old
            // `${color}4D` hex-alpha trick no longer parses.
            style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}
          >
            <Icon className="size-3.5" strokeWidth={1.5} style={{ color }} />
            <span className="num text-[length:var(--text-body)]" style={{ color }}>
              {value}
            </span>
          </span>
          <span className="text-[length:var(--text-label)] text-[var(--color-ash)]">
            {label}
          </span>
        </NavLink>
      ))}

      <NavLink to="/settings" className="flex shrink-0 flex-col items-center gap-2">
        <span className="flex size-16 items-center justify-center rounded-full border border-dashed border-[var(--color-ash-dim)]">
          <SlidersHorizontal className="size-5 text-[var(--color-ash)]" strokeWidth={1.5} />
        </span>
        <span className="text-[length:var(--text-label)] text-[var(--color-ash)]">
          Arrange
        </span>
      </NavLink>
    </div>
  );
}
