import { NavLink } from "react-router-dom";
import { Moon, Activity, HeartPulse, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { to: "/malam", label: "Malam Ini", Icon: Moon },
  { to: "/vital", label: "Vital", Icon: Activity },
  { to: "/sehat", label: "Sehat", Icon: HeartPulse },
];

/** Rendering is decided by AppShell — this bar disappears entirely
 *  while a sleep session runs. */
export function TabBar({ onAction }: { onAction?: () => void }) {
  return (
    <nav className="safe-b pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center gap-3 px-4 pb-4">
      <div className="pointer-events-auto flex items-center rounded-[var(--radius-pill)] bg-[var(--color-raised)]/85 px-2 py-2 backdrop-blur-xl">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 rounded-[var(--radius-pill)] px-4 py-1",
                isActive
                  ? "text-[var(--color-pulse)]"
                  : "text-[var(--color-ash)]",
              )
            }
          >
            <Icon className="size-5" strokeWidth={1.5} />
            <span className="text-[length:var(--text-label)]">{label}</span>
          </NavLink>
        ))}
      </div>

      <button
        onClick={onAction}
        aria-label="Aksi cepat"
        className="pointer-events-auto flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-raised)]/85 text-[var(--color-ivory)] backdrop-blur-xl active:translate-y-px"
      >
        <Plus className="size-6" strokeWidth={1.5} />
      </button>
    </nav>
  );
}
