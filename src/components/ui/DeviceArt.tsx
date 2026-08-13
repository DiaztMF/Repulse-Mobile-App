/** Dashed line ending in a dot, pointing at a detail on the hardware.
 *  Better than an arrow: it covers nothing, and the eye follows the line
 *  to the point. One per image — two means the image should have been
 *  two steps. */
export function Annotation({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="label text-[var(--color-ash)]">{label}</span>
      <span className="mt-2 h-10 border-l border-dashed border-[var(--color-pulse)]" />
      <span className="size-1.5 rounded-full bg-[var(--color-pulse)]" />
    </div>
  );
}

/** Stand-in until product photography exists. Left visibly unfinished:
 *  an invented illustration on a hardware setup screen would be taken
 *  for the real instruction. */
export function DeviceArt({
  caption,
  annotate,
}: {
  caption: string;
  annotate?: string;
}) {
  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-ash-dim)]/50 p-6">
      {annotate && <Annotation label={annotate} />}
      <span className="mt-4 text-center text-[length:var(--text-meta)] text-[var(--color-ash-dim)]">
        {caption}
      </span>
    </div>
  );
}
