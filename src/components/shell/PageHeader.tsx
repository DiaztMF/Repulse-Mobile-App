import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SampleBadge } from "./SampleBadge";

/** The single header for every screen that is not a tab root. Back sits
 *  left, title centred, an optional action right.
 *
 *  There is deliberately no second variant: an earlier circled-chevron
 *  version existed for onboarding, copied from a reference that puts it
 *  over photography. Our onboarding is a flat gradient, so the circle
 *  bought nothing and cost a second thing to keep in step. */
export function PageHeader({
  title,
  right,
  onBack,
}: {
  title: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="safe-t">
      <header className="grid h-14 grid-cols-[auto_1fr_auto] items-center px-5">
        <button onClick={onBack ?? (() => navigate(-1))} aria-label="Back">
          <ChevronLeft className="size-6" strokeWidth={1.5} />
        </button>
        <span className="label truncate text-center text-[var(--color-ivory)]">
          {title}
        </span>
        <span className="min-w-6 text-right">{right}</span>
      </header>
      <SampleBadge />
    </div>
  );
}
