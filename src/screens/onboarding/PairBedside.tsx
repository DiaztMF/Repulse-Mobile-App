import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { DeviceArt } from "@/components/ui/DeviceArt";

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
  const [stage, setStage] = useState<Stage>("searching");
  const [slow, setSlow] = useState(false);

  // TODO: replace with a real BLE scan and connect.
  useEffect(() => {
    if (stage !== "searching") return;
    const found = setTimeout(() => setStage("connected"), 2600);
    return () => clearTimeout(found);
  }, [stage]);

  // Real threshold is 30s; shortened here so the state is reachable
  // while building.
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const searching = stage === "searching";

  return (
    <div className="bg-setup flex min-h-screen flex-col px-6 pb-8">
      <div className="flex items-center justify-between">
        <TopBar />
        {searching && (
          <button
            onClick={() => navigate("/pair/bedside/trouble")}
            className="label rounded-[var(--radius-pill)] border border-[var(--color-pulse)] px-4 py-1.5 text-[var(--color-pulse)]"
          >
            Help
          </button>
        )}
      </div>

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
  );
}
