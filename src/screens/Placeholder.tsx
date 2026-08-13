import { Link } from "react-router-dom";

/** Deliberately unlike a finished screen — no fake skeletons, no
 *  sample data. Half-built screens that look built are how you lose
 *  track of what is actually done. */
export function Placeholder({ code, name }: { code: string; name: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col justify-center gap-2 px-5">
      <span className="label text-[var(--color-ash-dim)]">{code}</span>
      <h1 className="text-[length:var(--text-title)] font-medium">{name}</h1>
      <p className="text-[var(--color-ash)]">Not built yet.</p>
      <Link
        to="/kitchen-sink"
        className="mt-4 text-[var(--color-pulse)] underline underline-offset-4"
      >
        View base components
      </Link>
    </div>
  );
}
