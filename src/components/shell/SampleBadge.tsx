import { useStore } from "@/data/store";
import { COPY } from "@/lib/copy";

/** Required wherever synthetic data is on screen. A judge has to be able
 *  to tell invented numbers from measured ones at a glance, and nothing
 *  else in the app distinguishes them. */
export function SampleBadge() {
  if (!useStore().sample) return null;
  return (
    // Ash Grey, not Ash Dim: DESIGN §6.11 keeps Ash Dim off anything that
    // has to be read, and a judge has to read this one across a table.
    <p className="label pb-1 text-center text-[var(--color-ash)]">
      {COPY.mockBadge}
    </p>
  );
}
