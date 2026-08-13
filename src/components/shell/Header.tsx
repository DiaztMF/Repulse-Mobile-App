import { Menu, Share, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { Wordmark } from "@/components/brand/Wordmark";
import { SampleBadge } from "./SampleBadge";

export type DeviceState = "both" | "one" | "none" | "charging";

/** Four states in one 24px mark, so status reads without opening anything. */
function DeviceRing({ state }: { state: DeviceState }) {
  if (state === "charging") {
    return (
      <span className="relative flex size-6 items-center justify-center rounded-full border border-[var(--color-pulse)]">
        <Zap className="size-3 text-[var(--color-pulse)]" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "block size-6 rounded-full border",
        state === "both" && "border-[var(--color-pulse)]",
        state === "one" &&
          "border-[var(--color-pulse)] border-r-[var(--color-ash-dim)] border-b-[var(--color-ash-dim)]",
        state === "none" && "border-dashed border-[var(--color-ash-dim)]",
      )}
    />
  );
}

export function Header({
  status,
  devices = "none",
  unread = false,
  onMenu,
  onDevices,
}: {
  status?: string;
  devices?: DeviceState;
  unread?: boolean;
  onMenu?: () => void;
  onDevices?: () => void;
}) {
  return (
    // Grid, not flex-between: the wordmark centers on the screen rather
    // than between two unequal zones, and an SVG flex item drags its
    // viewBox width into the layout.
    <header className="safe-t sticky top-0 z-30 relative grid h-14 grid-cols-[1fr_auto_1fr] items-center bg-[var(--color-base)]/90 px-5 backdrop-blur-xl">
      <button
        onClick={onMenu}
        aria-label="Menu"
        className="relative justify-self-start"
      >
        <Menu className="size-6" strokeWidth={1.5} />
        {unread && (
          <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[var(--color-pulse)]" />
        )}
      </button>

      <div className="justify-self-center">
        {status ? (
          <span className="label text-[var(--color-ash)]">{status}</span>
        ) : (
          <Wordmark className="block h-auto w-[118px]" strokeWidth={6} />
        )}
      </div>

      <div className="flex items-center gap-4 justify-self-end">
        <Share className="size-5" strokeWidth={1.5} />
        <button onClick={onDevices} aria-label="Devices">
          <DeviceRing state={devices} />
        </button>
      </div>

      <SampleBadge />
    </header>
  );
}
