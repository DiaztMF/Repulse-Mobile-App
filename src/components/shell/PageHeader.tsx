import type { ReactNode } from "react";
import { ChevronLeft, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Night } from "@/data/mock";
import { useDrawer } from "./AppShell";
import { SampleBadge } from "./SampleBadge";

/** The single header for every screen that is not a tab root. Back sits
 *  left (or Hamburger Menu if showMenu is true), title centred, an optional action right. */
export function PageHeader({
  title,
  right,
  onBack,
  showMenu,
  sample = true,
  night,
}: {
  title: string;
  right?: ReactNode;
  onBack?: () => void;
  showMenu?: boolean;
  /** The one night this screen is about, when it is about one. Without it
   *  the badge falls back to the store-wide flag. */
  night?: Night;
  /* §12 wants the badge wherever invented numbers are on screen, and the
   * default keeps it. The exemption is for screens that show only live
   * device state — conformance, the test panel, devices — where every
   * figure comes off the air and the badge contradicts what it labels.
   * It was read as "this screen is running on sample data" for most of an
   * evening while the bedside sat connected two feet away. */
  sample?: boolean;
}) {
  const navigate = useNavigate();
  const { openDrawer } = useDrawer();

  const isMenu = showMenu && openDrawer;

  return (
    <div className="safe-t">
      <header className="grid h-14 grid-cols-[1fr_auto_1fr] items-center px-5">
        <button
          onClick={isMenu ? openDrawer : (onBack ?? (() => navigate(-1)))}
          aria-label={isMenu ? "Open menu" : "Back"}
          className="flex size-11 items-center justify-center -ml-2.5 rounded-full text-[var(--color-ivory)] hover:bg-[var(--color-surface)] transition-colors justify-self-start"
        >
          {isMenu ? (
            <Menu className="size-6" strokeWidth={1.5} />
          ) : (
            <ChevronLeft className="size-6" strokeWidth={1.5} />
          )}
        </button>
        <span className="label truncate text-center text-[var(--color-ivory)] justify-self-center max-w-[200px] sm:max-w-xs">
          {title}
        </span>
        <div className="justify-self-end flex items-center justify-end min-w-6">
          {typeof right === "string" ? (
            <span className="label text-[var(--color-ash)]">{right}</span>
          ) : (
            right
          )}
        </div>
      </header>
      {sample && <SampleBadge night={night} />}
    </div>
  );
}
