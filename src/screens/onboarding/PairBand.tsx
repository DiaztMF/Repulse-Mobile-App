import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { DeviceArt } from "@/components/ui/DeviceArt";
import { useMonitor } from "@/state/monitor";

type Stage = "searching" | "connecting" | "connected" | "no-radio";

/**
 * O6 — Pair the band. The stages are the radio's own link state, not a
 * script: an earlier version ran on two timers and a hard-coded serial, so
 * it reported a band connected on a phone with Bluetooth switched off.
 *
 * There is no "choose a device" step because there is nothing to choose
 * between. §2 has the app scan by service UUID, so the only things that
 * can answer are RePulse bands, and the first one to answer is the one on
 * the wrist. A list of one is a question with no question in it.
 */
export function PairBand() {
  const navigate = useNavigate();
  const { connect, links } = useMonitor();
  const [radio, setRadio] = useState<boolean | null>(null);

  // Started once, on arrival. The transport keeps scanning until it finds
  // something, so re-running this would only restart the search that is
  // already going.
  useEffect(() => {
    let live = true;
    void connect().then((ok) => {
      if (live) setRadio(ok);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stage: Stage =
    radio === false
      ? "no-radio"
      : links.band === "connected"
        ? "connected"
        : links.band === "lost"
          ? "connecting"
          : "searching";

  const TITLE: Record<Stage, string> = {
    searching: "Searching for band…",
    connecting: "Reconnecting",
    connected: "Band connected",
    "no-radio": "No Bluetooth",
  };

  const ART: Record<Stage, string> = {
    searching: "Band with its indicator light on",
    connecting: "Phone and band reaching for each other",
    connected: "",
    "no-radio": "Band with its indicator light on",
  };

  const SUB: Record<Stage, string> = {
    searching: "Make sure the band is switched on and within reach.",
    connecting: "The band answered and then went quiet. Still trying.",
    connected: "Paired. It will reconnect on its own from now on.",
    "no-radio":
      "Switch Bluetooth on and come back. Nothing can be found until it is.",
  };

  return (
    <div className="bg-setup flex min-h-screen flex-col pb-8">
      <PageHeader
        title="Pair your band"
        right={
          stage !== "connected" ? (
            <button
              onClick={() => navigate("/pair/band/trouble")}
              className="label rounded-[var(--radius-pill)] border border-[var(--color-pulse)] px-4 py-1.5 text-[var(--color-pulse)]"
            >
              Help
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col px-6">

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
            <p className="num mt-6 text-[length:var(--text-card)]">RePulse Band</p>
          </div>
        ) : (
          <DeviceArt caption={ART[stage]} />
        )}
      </div>

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
    </div>
  );
}
