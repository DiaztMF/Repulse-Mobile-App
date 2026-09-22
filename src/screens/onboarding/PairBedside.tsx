import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { DeviceArt } from "@/components/ui/DeviceArt";
import { useMonitor } from "@/state/monitor";
import { Capacitor } from "@capacitor/core";

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
  const { connect, links, bluetooth, retry } = useMonitor();
  const [slow, setSlow] = useState(false);
  /* Same as the band's screen: a browser never finds anything by itself,
     so the chooser has to be opened from a tap. */
  const web = !Capacitor.isNativePlatform();
  const [asking, setAsking] = useState(false);
  /** No radio at all — a browser, or Bluetooth switched off. Distinct from
   *  "searching": one is worth waiting through and the other never ends.
   *  This screen has no skip by design, and a screen with no skip and no
   *  way to succeed is a wall. */
  const [radio, setRadio] = useState<boolean | null>(null);

  // The band's screen started the radio; this makes the page work when it
  // is reached on its own, from a resumed setup. Scanning twice is not a
  // second scan — the transport is already looking.
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

  // §6: the causes are offered once looking has stopped being reassuring.
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 30_000);
    return () => clearTimeout(t);
  }, []);

  const stage: Stage = links.bedside === "connected" ? "connected" : "searching";
  const searching = stage === "searching";
  // No transport, or the switch is off. The second clears by itself.
  const off = radio === false || bluetooth === false;

  return (
    <div className="bg-setup flex min-h-screen flex-col pb-8">
      <PageHeader
        sample={false}
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
        {!searching
          ? "Bedside unit connected"
          : web
            ? "Choose your bedside unit"
            : "Searching for bedside unit…"}
      </p>
      <p className="mt-3 text-center text-[var(--color-ash)]">
        {!searching
          ? "Plugged in · strong signal"
          : web
            ? "Plug it in, then pick RePulse Bedside from the list your browser shows."
            : "It should be plugged in and beside your pillow."}
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
              RePulse Bedside
            </p>
          </div>
        )}
      </div>

      {searching && off && (
        <p className="mt-8 text-[var(--color-ash)]">
          Bluetooth is off, so nothing can be found. Switch it on and
          searching starts by itself, or carry on, and the app will run on
          sample data until a bedside unit is paired.
        </p>
      )}

      {searching && !off && slow && (
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

      {/* Selalu ada, termasuk selagi memindai.
        *
        * Dulu tombol ini hanya muncul saat pencarian sudah berhenti atau
        * Bluetooth mati — yaitu justru BUKAN keadaan yang biasa. Dalam
        * keadaan biasa layar ini memindai tanpa batas waktu, dan satu-
        * satunya jalan keluar adalah menunggu bedside ditemukan. Orang yang
        * bedside-nya belum dirakit terjebak di sini. */}
      {web && searching && (
        <Button
          size="lg"
          register="system"
          className="mb-3"
          disabled={asking}
          onClick={() => {
            setAsking(true);
            void retry().finally(() => setAsking(false));
          }}
        >
          {asking ? "Waiting for your pick…" : "Choose bedside unit"}
        </Button>
      )}

      {(
        <Button
          size="lg"
          register={!searching ? "system" : undefined}
          variant={!searching ? "primary" : "secondary"}
          /* Straight to contacts: baseline calibration is three minutes
             of watching nothing, and monitor.tsx already falls back to
             TUNING.baselineBpm when no baseline was recorded. Ready says
             "Not measured yet" rather than inventing a resting rate.
             /calibration stays in STEPS so an account that stopped there
             still resumes somewhere real, and the screen is still
             reachable from the test panel. */
          onClick={() => navigate("/onboarding/contacts")}
        >
          {!searching ? "Continue" : "Skip, set this up later"}
        </Button>
      )}
      </div>
    </div>
  );
}
