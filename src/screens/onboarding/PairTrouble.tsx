import { useNavigate, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

const DEVICE = {
  band: {
    name: "band",
    first: "Check the band is charged and switched on. Its light should be visible",
  },
  bedside: {
    name: "bedside unit",
    first: "Check the bedside unit is plugged into power",
  },
} as const;

/**
 * O6b — Pairing troubleshooting, shared by both pairing screens.
 *
 * The location item is listed first because it is the failure nobody
 * can see: without it Android returns an empty scan and reports no
 * error at all, so the app looks broken rather than unpermitted.
 */
export function PairTrouble() {
  const navigate = useNavigate();
  const { device } = useParams<{ device: keyof typeof DEVICE }>();
  const d = DEVICE[device ?? "band"] ?? DEVICE.band;

  const steps = [
    "Grant location permission. Without it Android returns an empty scan and shows no error",
    d.first,
    "Check Bluetooth is on",
    "Hold the phone within arm's reach",
    "Turn Wi-Fi off. 2.4 GHz Wi-Fi and Bluetooth share the same band",
  ];

  // The strip above the sheet is the screen it covers, not a colour of its
  // own — hardcoded black left a bar of night across the top of a linen page.
  return (
    <div className="min-h-screen bg-[var(--color-base)] pt-6">
      {/* Sheet over the pairing screen rather than a new page: the search
          it interrupts is still the thing being worked on. */}
      <div className="bg-setup flex min-h-[calc(100vh-1.5rem)] flex-col rounded-t-[28px] px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-10">
        <h1 className="text-[length:var(--text-title)] font-medium leading-snug">
          Trouble connecting to your {d.name}
        </h1>

        <p className="mt-6 text-[var(--color-ash)]">Try these extra steps:</p>

        <ul className="mt-5 space-y-4">
          {steps.map((s) => (
            <li key={s} className="flex gap-3">
              {/* Bullets, not state. Ivory rather than accent so they are
                  not misread as things already done. */}
              <Check
                className="mt-0.5 size-5 shrink-0 text-[var(--color-ivory)]"
                strokeWidth={1.5}
              />
              <span className="text-[var(--color-ivory)]">{s}</span>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[var(--color-ash)]">
          Still stuck? Open{" "}
          <button
            onClick={() => navigate("/permissions")}
            className="text-[var(--color-ivory)] underline underline-offset-4"
          >
            permissions
          </button>{" "}
          and check what was granted.
        </p>

        <div className="flex-1" />

        <Button size="lg" variant="inverse" onClick={() => navigate(-1)}>
          Try again
        </Button>

        {/* Not "continue without it": there is no app without a paired
            device, so that button would promise a path that does not
            exist. This is the only honest way out of the loop. */}
        <a
          href="mailto:support@repulse.id?subject=Pairing%20trouble"
          className="label mt-6 self-center text-[var(--color-ash)]"
        >
          Get help
        </a>
      </div>
    </div>
  );
}
