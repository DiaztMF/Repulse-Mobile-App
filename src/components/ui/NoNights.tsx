import type { ReactNode } from "react";

/**
 * What a history screen shows before the first night exists.
 *
 * A new account used to be handed the synthetic fortnight instead,
 * stamped SAMPLE DATA. The badge was honest and everything under it was
 * not: fourteen scores, a pulse trend and a breathing pattern belonging
 * to nobody. An empty screen that says why is the smaller lie — it is
 * not a lie at all.
 */
export function NoNights({ children }: { children?: ReactNode }) {
  return (
    <div className="px-5 py-16 text-center">
      <p className="text-[length:var(--text-card)]">Nothing recorded yet</p>
      <p className="mx-auto mt-3 max-w-[32ch] text-[var(--color-ash)]">
        {children ??
          "Wear the band and start a session tonight. Your first night appears here in the morning."}
      </p>
    </div>
  );
}
