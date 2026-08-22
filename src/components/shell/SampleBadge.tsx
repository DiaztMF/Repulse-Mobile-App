import { isSynthetic, type Night } from "@/data/mock";
import { useStore } from "@/data/store";
import { COPY } from "@/lib/copy";

/** Required wherever synthetic data is on screen. A judge has to be able
 *  to tell invented numbers from measured ones at a glance, and nothing
 *  else in the app distinguishes them.
 *
 *  A screen showing one named night says which night, and is answered
 *  about that night alone. `store.sample` is a single flag for the whole
 *  app: one seeded row anywhere turned it on, so the first night the band
 *  actually recorded was stamped SAMPLE DATA while sitting beside
 *  thirteen seeded ones. That errs safe, but it tells the owner their own
 *  measured night was invented, which is its own kind of lie.
 *
 *  Screens that summarise a stretch of nights — the health list, the
 *  breathing trend, an export of several — keep the store-wide answer,
 *  because there is no single night for them to be asked about. */
export function SampleBadge({ night }: { night?: Night }) {
  const { sample } = useStore();
  if (!(night ? isSynthetic(night) : sample)) return null;
  return (
    // Ash Grey, not Ash Dim: DESIGN §6.11 keeps Ash Dim off anything that
    // has to be read, and a judge has to read this one across a table.
    <p className="label pb-1 text-center text-[var(--color-ash)]">
      {COPY.mockBadge}
    </p>
  );
}
