import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Activity, Flag, FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";

const ACTIONS = [
  {
    to: "/tonight/session",
    label: "Start sleep",
    note: "Skip the sunset and begin monitoring now",
    Icon: Moon,
  },
  {
    to: "/ecg",
    label: "Record ECG",
    note: "30 seconds, needs a finger on the contact",
    Icon: Activity,
  },
  {
    to: "/tonight",
    label: "Log an event",
    note: "Mark something you noticed",
    Icon: Flag,
  },
  {
    to: "/test-panel",
    label: "Test panel",
    note: "Drive each actuator by hand",
    Icon: FlaskConical,
  },
];

/** X3. Reached from the round button beside the tab bar.
 *  Upgraded with native iOS spring physics, body scroll locking, glassmorphism blur,
 *  and staggered item entrance micro-interactions. */
export function ActionSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(open);
  const [active, setActive] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Lock background body scroll so fast swipes don't drag the page underneath
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => setActive(true), 10);
      return () => clearTimeout(timer);
    } else {
      setActive(false);
      document.body.style.overflow = "";
      const timer = setTimeout(() => setMounted(false), 280);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end overflow-hidden">
      {/* Backdrop with Backdrop Blur & Smooth Fade */}
      <button
        aria-label="Close action menu"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out",
          active ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Slide-Up Sheet Container with Apple iOS Spring Physics */}
      <div
        className={cn(
          "relative w-full rounded-t-[32px] bg-[var(--color-surface)] border-t border-[var(--color-ash-dim)]/20 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4",
          active ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* iOS Drag Handle Pill */}
        <div className="flex items-center justify-center pb-4">
          <span className="block h-1 w-10 rounded-full bg-[var(--color-ash-dim)]/60" />
        </div>

        <ul className="space-y-2">
          {ACTIONS.map(({ to, label, note, Icon }, index) => (
            <li
              key={label}
              style={{
                transitionDelay: `${active ? index * 40 : 0}ms`,
              }}
              className={cn(
                "transition-all duration-300 ease-out",
                active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              )}
            >
              <button
                onClick={() => {
                  onClose();
                  navigate(to);
                }}
                className="flex w-full items-center gap-4 rounded-[var(--radius-card)] bg-[var(--color-raised)]/40 hover:bg-[var(--color-raised)] p-3.5 text-left active:scale-[0.98] transition-all duration-200"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-raised)] text-[var(--color-pulse)]">
                  <Icon className="size-5" strokeWidth={1.5} />
                </span>
                <span>
                  <span className="block text-[length:var(--text-card)] font-medium text-[var(--color-ivory)]">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[length:var(--text-meta)] text-[var(--color-ash)]">
                    {note}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
