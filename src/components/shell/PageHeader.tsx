import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SampleBadge } from "./SampleBadge";

/** Back, title, optional action. Used by every screen that is not a tab
 *  root — the shell owns the tab bar and nothing above it. */
export function PageHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="safe-t relative grid h-14 grid-cols-[auto_1fr_auto] items-center px-5">
      <button onClick={() => navigate(-1)} aria-label="Back">
        <ChevronLeft className="size-6" strokeWidth={1.5} />
      </button>
      <span className="label truncate text-center text-[var(--color-ivory)]">
        {title}
      </span>
      <span className="min-w-6 text-right">{right}</span>
      <SampleBadge />
    </header>
  );
}
