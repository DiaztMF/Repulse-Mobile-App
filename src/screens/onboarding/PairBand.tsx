import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";

type Stage = "searching" | "choosing" | "connecting" | "connected";

const SERIAL = "4C0521039";

/** Dashed line ending in a dot, pointing at a detail on the hardware.
 *  Better than an arrow: it covers nothing, and the eye follows the
 *  line to the point. One per image — two means the image should have
 *  been two steps. */
function Annotation({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="label text-[var(--color-ash)]">{label}</span>
      <span className="mt-2 h-10 border-l border-dashed border-[var(--color-pulse)]" />
      <span className="size-1.5 rounded-full bg-[var(--color-pulse)]" />
    </div>
  );
}

/** Stand-in until product photography exists. */
function Art({ caption, annotate }: { caption: string; annotate?: string }) {
  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-ash-dim)]/50 p-6">
      {annotate && <Annotation label={annotate} />}
      <span className="mt-4 text-center text-[length:var(--text-meta)] text-[var(--color-ash-dim)]">
        {caption}
      </span>
    </div>
  );
}

/**
 * O6 — Pair the band. Four stages in one screen rather than four routes:
 * the user is doing one thing, and a back button between stages would
 * offer to un-search.
 */
export function PairBand() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("searching");

  // TODO: replace with a real BLE scan and connect.
  useEffect(() => {
    if (stage === "searching") {
      const t = setTimeout(() => setStage("choosing"), 2200);
      return () => clearTimeout(t);
    }
    if (stage === "connecting") {
      const t = setTimeout(() => setStage("connected"), 1600);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const TITLE: Record<Stage, string> = {
    searching: "Searching for band…",
    choosing: "Choose a device",
    connecting: "Connecting",
    connected: "Band connected",
  };

  const ART: Record<Stage, string> = {
    searching: "Band with its indicator light on",
    choosing: "Underside of the band, serial number visible",
    connecting: "Phone and band reaching for each other",
    connected: "",
  };

  const SUB: Record<Stage, string> = {
    searching: "Make sure the band is switched on and within reach.",
    choosing: "Confirm the serial number printed on the underside of the band.",
    connecting: `Pairing with RePulse Band ${SERIAL}`,
    connected: "Battery 87% · strong signal",
  };

  return (
    <div className="bg-setup flex min-h-screen flex-col px-6 pb-8">
      <div className="flex items-center justify-between">
        <TopBar />
        {stage !== "connected" && (
          <button
            onClick={() => navigate("/pair/band/trouble")}
            className="label rounded-[var(--radius-pill)] border border-[var(--color-pulse)] px-4 py-1.5 text-[var(--color-pulse)]"
          >
            Help
          </button>
        )}
      </div>

      {/* System register: uppercase and centred, because the machine is
          the one talking here. */}
      <p className="label mt-8 text-center text-[var(--color-ivory)]">
        {TITLE[stage]}
      </p>
      <p className="mt-3 text-center text-[var(--color-ash)]">{SUB[stage]}</p>

      <div className="mt-10">
        {stage === "connected" ? (
          <div className="flex flex-col items-center py-10">
            <span className="flex size-20 items-center justify-center rounded-full bg-[var(--color-pulse)]">
              <Check className="size-10 text-[var(--color-base)]" strokeWidth={2.5} />
            </span>
            <p className="num mt-6 text-[length:var(--text-card)]">
              RePulse Band {SERIAL}
            </p>
          </div>
        ) : (
          <Art
            caption={ART[stage]}
            annotate={stage === "choosing" ? "Serial number" : undefined}
          />
        )}
      </div>

      {stage === "choosing" && (
        <button
          onClick={() => setStage("connecting")}
          className="mt-8 flex w-full items-center justify-between rounded-[var(--radius-control)] bg-[var(--color-ivory)]/[0.06] px-5 py-4 text-left"
        >
          <span className="num text-[length:var(--text-body)]">
            RePulse Band {SERIAL}
          </span>
          <ChevronRight className="size-5 text-[var(--color-ash)]" strokeWidth={1.5} />
        </button>
      )}

      <div className="flex-1" />

      {stage === "connected" && (
        <Button
          size="lg"
          register="system"
          onClick={() => navigate("/pair/bedside")}
        >
          Continue
        </Button>
      )}

      {stage === "searching" && (
        <button
          onClick={() => navigate("/pair/band/trouble")}
          className="label mt-6 self-center text-[var(--color-ash)]"
        >
          Not showing up?
        </button>
      )}
    </div>
  );
}
