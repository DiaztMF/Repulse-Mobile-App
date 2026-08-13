import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/** Onboarding header. The back control is a circled chevron rather than
 *  a bare arrow so it holds its own against a photographic backdrop. */
export function TopBar({
  title,
  right,
  onBack,
}: {
  title?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <header className="safe-t grid h-14 grid-cols-[auto_1fr_auto] items-center gap-3">
      <button
        onClick={onBack ?? (() => navigate(-1))}
        aria-label="Back"
        className="flex size-9 items-center justify-center rounded-full border border-[var(--color-ivory)]/40"
      >
        <ChevronLeft className="size-5" strokeWidth={1.5} />
      </button>

      {title && (
        <span className="label truncate text-center text-[var(--color-ivory)]">
          {title}
        </span>
      )}

      <span className="label min-w-9 text-right text-[var(--color-ash)]">
        {right}
      </span>
    </header>
  );
}
