import { useStore } from "@/data/store";
import { COPY } from "@/lib/copy";

/** Required wherever synthetic data is on screen. A judge has to be able
 *  to tell invented numbers from measured ones at a glance, and nothing
 *  else in the app distinguishes them. */
export function SampleBadge() {
  if (!useStore().sample) return null;
  return (
    <span className="label absolute inset-x-0 -bottom-1 text-center text-[var(--color-ash-dim)]">
      {COPY.mockBadge}
    </span>
  );
}
