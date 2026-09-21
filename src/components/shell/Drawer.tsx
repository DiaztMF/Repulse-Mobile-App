import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/firebase/auth";
import { useTheme } from "@/state/theme";
import {
  Settings,
  Watch,
  Phone,
  FlaskConical,
  ListChecks,
  Download,
  X,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { to: "/settings", label: "Settings", Icon: Settings },
  { to: "/devices", label: "Devices", Icon: Watch },
  { to: "/contacts", label: "Emergency contacts", Icon: Phone },
  { to: "/export", label: "Export", Icon: Download },
  { to: "/test-panel", label: "Test panel", Icon: FlaskConical },
  { to: "/conformance", label: "GATT conformance", Icon: ListChecks },
];

/** Everything that is not a tab lives here. Kept as a plain overlay
 *  rather than a routed page so closing it returns you to exactly where
 *  you were, mid-scroll included. */
export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, leave } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [mounted, setMounted] = useState(open);
  const [active, setActive] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const timer = setTimeout(() => setActive(true), 10);
      return () => clearTimeout(timer);
    } else {
      setActive(false);
      const timer = setTimeout(() => setMounted(false), 280);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!mounted) return null;

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop with Backdrop-Blur & Smooth Fade */}
      <button
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out",
          active ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Slide-out Drawer Panel with Spring Physics Timing */}
      <nav
        className={cn(
          "absolute inset-y-0 left-0 w-[80%] max-w-[310px] bg-[var(--color-surface)] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-6 flex flex-col justify-between border-r border-[var(--color-ash-dim)]/20",
          active ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div>
          {/* Header & Animated Theme + Close Buttons */}
          <div className="flex items-center justify-between mb-6">
            <span className="label text-[var(--color-ash)] tracking-widest text-[11px] uppercase">
              Navigation
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="flex size-9 items-center justify-center rounded-full bg-[var(--color-raised)] text-[var(--color-ash)] hover:text-[var(--color-ivory)] active:scale-90 transition-all duration-300"
              >
                {theme === "dark" ? (
                  <Sun className="size-4.5 text-[var(--color-pulse)]" strokeWidth={1.5} />
                ) : (
                  <Moon className="size-4.5 text-[var(--color-pulse)]" strokeWidth={1.5} />
                )}
              </button>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="flex size-9 items-center justify-center rounded-full bg-[var(--color-raised)] text-[var(--color-ash)] hover:text-[var(--color-ivory)] hover:rotate-90 active:scale-90 transition-all duration-300"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Menu Items with Staggered Fade-Slide Entrance */}
          <ul className="space-y-1">
            {ITEMS.map(({ to, label, Icon }, i) => {
              const isCurrent = location.pathname === to;
              return (
                <li key={to}>
                  <button
                    onClick={() => go(to)}
                    style={{ transitionDelay: active ? `${i * 30}ms` : "0ms" }}
                    className={cn(
                      "group flex w-full items-center gap-3.5 rounded-[var(--radius-control)] px-3.5 py-3 text-left transition-all duration-200",
                      active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3",
                      isCurrent
                        ? "bg-[var(--color-raised)] text-[var(--color-pulse)] font-medium"
                        : "text-[var(--color-ivory)] hover:bg-[var(--color-raised)]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5 transition-transform duration-200 group-hover:scale-110",
                        isCurrent ? "text-[var(--color-pulse)]" : "text-[var(--color-ash)] group-hover:text-[var(--color-ivory)]"
                      )}
                      strokeWidth={1.5}
                    />
                    <span className="flex-1">{label}</span>
                    {isCurrent && (
                      <span className="size-1.5 rounded-full bg-[var(--color-pulse)] animate-pulse" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer Account & Sign-out */}
        {user && (
          <div className="border-t border-[var(--color-ash-dim)]/20 pt-4">
            <div className="px-3.5 py-1">
              <p className="label text-[10px] text-[var(--color-ash)] uppercase tracking-wider">
                Signed in as
              </p>
              <p className="truncate text-[length:var(--text-meta)] text-[var(--color-ivory)] font-medium mt-0.5">
                {user.email}
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                void leave();
                navigate("/sign-in", { replace: true });
              }}
              className="mt-2 flex w-full items-center gap-3.5 rounded-[var(--radius-control)] px-3.5 py-3 text-left text-[var(--color-ash)] hover:text-[var(--color-band-poor)] hover:bg-[var(--color-raised)] transition-all duration-200 active:scale-98"
            >
              <LogOut className="size-5 shrink-0" strokeWidth={1.5} />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}
