import { useNavigate } from "react-router-dom";
import {
  Settings,
  Watch,
  Phone,
  FlaskConical,
  Users,
  Download,
  Activity,
  X,
} from "lucide-react";

const ITEMS = [
  { to: "/settings", label: "Settings", Icon: Settings },
  { to: "/devices", label: "Devices & battery", Icon: Watch },
  { to: "/contacts", label: "Emergency contacts", Icon: Phone },
  { to: "/ecg", label: "Record ECG", Icon: Activity },
  { to: "/family", label: "Family", Icon: Users },
  { to: "/export", label: "Export", Icon: Download },
  { to: "/test-panel", label: "Test panel", Icon: FlaskConical },
];

/** Everything that is not a tab lives here. Kept as a plain overlay
 *  rather than a routed page so closing it returns you to exactly where
 *  you were, mid-scroll included. */
export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  if (!open) return null;

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <nav className="safe-t absolute inset-y-0 left-0 w-[78%] max-w-[300px] bg-[var(--color-surface)] px-5 pt-4">
        <button onClick={onClose} aria-label="Close menu" className="mb-6 block">
          <X className="size-6" strokeWidth={1.5} />
        </button>

        <ul className="space-y-1">
          {ITEMS.map(({ to, label, Icon }) => (
            <li key={to}>
              <button
                onClick={() => go(to)}
                className="flex w-full items-center gap-4 rounded-[var(--radius-control)] px-3 py-3.5 text-left"
              >
                <Icon className="size-5 text-[var(--color-ash)]" strokeWidth={1.5} />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
