import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StepBar } from "@/components/ui/StepBar";

/**
 * Steps 1 and 2 are not filler. A loose band produces a garbage baseline,
 * and a wrong baseline makes every personal threshold wrong for the next
 * two weeks. Step 3 decides whether the lux reading represents light
 * reaching the eyes or light in a corner of the table.
 */
const STEPS = [
  {
    art: "Band on wrist, two fingers above the wrist bone",
    title: "Wear the band on your non-dominant wrist",
    body: "Sit it two fingers above the wrist bone. The sensor has to lie flat against skin, not hang loose.",
  },
  {
    art: "Clasp being tightened, before and after",
    title: "Tighten it until it stops sliding",
    body: "Snug enough that one finger cannot shift it, loose enough that it never presses. Too tight closes off the blood flow it is reading.",
  },
  {
    art: "Bedside unit next to a pillow, sensor facing the head",
    title: "Put the bedside unit beside your pillow",
    body: "Between 30 and 80 cm from your head, with the light sensor facing where your face rests.",
  },
  {
    art: "Bedside unit plugged into a wall socket",
    title: "Plug the bedside unit in",
    body: "It has no battery. It has to stay plugged in all night, every night.",
  },
];

/**
 * O5 — Setup guide. Horizontal scroll-snap rather than a carousel
 * library: swiping is the expected gesture on a phone, and the platform
 * already does it with no JavaScript.
 */
export function SetupGuide() {
  const navigate = useNavigate();
  const track = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setStep(Math.round(el.scrollLeft / el.clientWidth));
  };

  const next = () => {
    const el = track.current;
    if (step === STEPS.length - 1) return navigate("/pair/band");
    el?.scrollTo({ left: (step + 1) * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="bg-setup flex min-h-screen flex-col">
      <div className="safe-t flex h-14 items-center px-5">
        <button
          onClick={() => navigate("/pair/band")}
          aria-label="Close"
          className="flex size-9 items-center justify-center"
        >
          <X className="size-6" strokeWidth={1.5} />
        </button>
      </div>

      <div
        ref={track}
        onScroll={onScroll}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto"
      >
        {STEPS.map((s) => (
          <section
            key={s.title}
            className="flex w-full shrink-0 snap-center flex-col px-6"
          >
            {/* Placeholder until product photography exists. Left visibly
                unfinished on purpose — a fake illustration here would be
                mistaken for the real instruction. */}
            <div className="flex flex-1 items-center justify-center">
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-ash-dim)]/50 p-6">
                <span className="text-center text-[length:var(--text-meta)] text-[var(--color-ash-dim)]">
                  {s.art}
                </span>
              </div>
            </div>

            <h2 className="mt-8 text-[length:var(--text-title)] font-medium leading-snug">
              {s.title}
            </h2>
            <p className="mt-3 text-[var(--color-ash)]">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-8">
        <StepBar total={STEPS.length} current={step + 1} />
        <Button size="lg" register="system" className="mt-6" onClick={next}>
          {step === STEPS.length - 1 ? "Continue" : "Next"}
        </Button>
      </div>
    </div>
  );
}
