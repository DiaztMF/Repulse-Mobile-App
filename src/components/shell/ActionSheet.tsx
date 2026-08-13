import { useNavigate } from "react-router-dom";
import { Moon, Activity, Flag, FlaskConical } from "lucide-react";

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

/** X3. Reached from the round button beside the tab bar. */
export function ActionSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <div className="safe-b relative rounded-t-[28px] bg-[var(--color-surface)] px-5 pb-8 pt-4">
        <span className="mx-auto mb-6 block h-1 w-10 rounded-full bg-[var(--color-ash-dim)]" />

        <ul className="space-y-1">
          {ACTIONS.map(({ to, label, note, Icon }) => (
            <li key={label}>
              <button
                onClick={() => {
                  onClose();
                  navigate(to);
                }}
                className="flex w-full items-center gap-4 rounded-[var(--radius-control)] px-3 py-4 text-left"
              >
                <Icon className="size-5 text-[var(--color-ash)]" strokeWidth={1.5} />
                <span>
                  <span className="block">{label}</span>
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
