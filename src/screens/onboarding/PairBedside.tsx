import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { DeviceArt } from "@/components/ui/DeviceArt";
import { useMonitor } from "@/state/monitor";

type Stage = "searching" | "connected";

/** Surfaced instead of a skip button. Naming the likely causes gives the
 *  user something to act on; skipping would only hand them an app with
 *  no comfort loop and no siren. */
const CAUSES = [
  "It is not plugged in",
  "It is more than a few metres away",
  "It is still paired to another phone",
];

/**
 * O7 — Pair the bedside unit. Two stages, no serial confirmation: there
 * is one bedside unit per room, so there is nothing to disambiguate.
 *
 * Deliberately has no skip. The bedside unit drives sunset, white noise,
 * the diffuser and the siren — without it the comfort loop and the
 * learning loop both die, so "later" would be a lie.
 */
export function PairBedside() {
  const navigate = useNavigate();
  const { connect, links } = useMonitor();
  const [slow, setSlow] = useState(false);

  // The band's screen started the radio; this makes the page work when it
  // is reached on its own, from a resumed setup. Scanning twice is not a
  // second scan — the transport is already looking.
  useEffect(() => {
    void connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // §6: the causes are offered once looking has stopped being reassuring.
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 30_000);
    return () => clearTimeout(t);
  }, []);

  const stage: Stage = links.bedside === "connected" ? "connected" : "searching";
  const searching = stage === "searching";

  return (
    <div className="bg-setup flex min-h-screen flex-col pb-8">
      <PageHeader
        title="Pair the bedside unit"
        right={
          searching ? (
            <button
              onClick={() => navigate("/pair/bedside/trouble")}
              className="label rounded-[var(--radius-pill)] border border-[var(--color-pulse)] px-4 py-1.5 text-[var(--color-pulse)]"
            >
              Help
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col px-6">

      <p className="label mt-8 text-center text-[var(--color-ivory)]">
        {searching ? "Searching for bedside unit…" : "Bedside unit connected"}
      </p>
      <p className="mt-3 text-center text-[var(--color-ash)]">
        {searching
          ? "It should be plugged in and beside your pillow."
          : "Plugged in · strong signal"}
      </p>

      <div className="mt-10">
        {searching ? (
          <DeviceArt caption="Bedside unit with its indicator light on" />
        ) : (
          <div className="flex flex-col items-center py-10">
            <span className="flex size-20 items-center justify-center rounded-full bg-[var(--color-pulse)]">
              <Check
                className="size-10 text-[var(--color-base)]"
                strokeWidth={2.5}
              />
            </span>
            <p className="num mt-6 text-[length:var(--text-card)]">
              RePulse Bedside 2A19
            </p>
          </div>
        )}
      </div>

      {searching && slow && (
        <div className="mt-8">
          <p className="text-[var(--color-ash)]">
            Still nothing. The usual reasons:
          </p>
          <ul className="mt-3 space-y-2">
            {CAUSES.map((c) => (
              <li
                key={c}
                className="flex items-center gap-3 text-[var(--color-ivory)]"
              >
                <span className="size-1 rounded-full bg-[var(--color-pulse)]" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1" />

      {!searching && (
        <Button
          size="lg"
          register="system"
          onClick={() => navigate("/calibration")}
        >
          Continue
        </Button>
      )}
      </div>
    </div>
  );
}
