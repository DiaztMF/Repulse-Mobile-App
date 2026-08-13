import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";

const DONE = [
  { title: "Band", detail: "RePulse Band 4C0521039 · 87%" },
  { title: "Bedside unit", detail: "RePulse Bedside 2A19 · plugged in" },
  { title: "Your resting pulse", detail: "62 bpm" },
  { title: "Emergency contact", detail: "Sari" },
];

/**
 * O10 — Ready. The last line matters more than the checklist: if the
 * user leaves onboarding still believing they must press something every
 * night, the sunset sequence will never run.
 */
export function Ready() {
  const navigate = useNavigate();

  return (
    <div className="bg-setup flex min-h-screen flex-col px-6 pb-8 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
      <h1 className="text-[length:var(--text-title)] font-medium">
        Everything is ready
      </h1>

      <div className="mt-8 divide-y divide-[var(--color-ash-dim)]/25 rounded-[var(--radius-card)] bg-[var(--color-surface)]">
        {DONE.map((d) => (
          <div key={d.title} className="flex items-start gap-3 p-5">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-pulse)]">
              <Check className="size-3.5 text-[var(--color-base)]" strokeWidth={3} />
            </span>
            <div>
              <p className="text-[length:var(--text-card)] font-medium">
                {d.title}
              </p>
              <p className="mt-0.5 text-[length:var(--text-meta)] text-[var(--color-ash)]">
                {d.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="label mt-10 text-[var(--color-ash)]">Tonight</p>
      <div className="mt-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[var(--color-ash)]">Sunset begins</span>
          <span className="num text-[length:var(--text-body)]">21:40</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[var(--color-ash)]">Wake window</span>
          <span className="num text-[length:var(--text-body)]">06:00–06:30</span>
        </div>
      </div>

      <p className="mt-8 text-[var(--color-ash)]">
        The lights start dimming on their own at 21:40. You do not have to do
        anything.
      </p>

      <div className="flex-1" />

      <Button
        size="lg"
        register="system"
        className="mt-10"
        onClick={() => navigate("/tonight", { replace: true })}
      >
        Done
      </Button>

      <p className="label mt-6 text-center text-[var(--color-ash)]">
        {COPY.disclaimer}
      </p>
    </div>
  );
}
