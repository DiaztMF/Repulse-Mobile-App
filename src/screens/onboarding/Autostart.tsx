import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";

/**
 * Toggle names differ per vendor and naming the wrong one is worse than
 * naming none, so each entry carries the exact labels the user will see
 * in that manufacturer's settings app.
 */
const VENDORS: Record<string, { label: string; toggles: string[] }> = {
  xiaomi: { label: "Xiaomi", toggles: ["Autostart", "No battery restrictions"] },
  redmi: { label: "Xiaomi", toggles: ["Autostart", "No battery restrictions"] },
  poco: { label: "Xiaomi", toggles: ["Autostart", "No battery restrictions"] },
  oppo: { label: "Oppo", toggles: ["Auto-launch", "Allow background activity"] },
  vivo: { label: "Vivo", toggles: ["Auto-start", "High background power"] },
  realme: { label: "Realme", toggles: ["Auto-launch", "Allow background activity"] },
  huawei: { label: "Huawei", toggles: ["Auto-launch", "Manage manually"] },
};

// TODO: read from Capacitor Device.getInfo().
const MANUFACTURER = "xiaomi";

/**
 * O4 — Vendor autostart. The number one cause of silent failure on
 * non-stock Android: the foreground service is killed and nobody finds
 * out until morning.
 *
 * Android exposes no way to check whether this was actually granted, so
 * the confirmation here is the user's word, never a verified state. It
 * must not be presented as if it were checked.
 */
export function Autostart() {
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);

  const vendor = VENDORS[MANUFACTURER.toLowerCase()];

  // Stock devices don't need this. Skip rather than show a step that
  // does nothing.
  useEffect(() => {
    if (!vendor) navigate("/setup-guide", { replace: true });
  }, [vendor, navigate]);

  if (!vendor) return null;

  const openSettings = () => {
    // TODO: intent-launcher to the vendor's autostart activity.
    setOpened(true);
  };

  return (
    <div className="bg-setup flex min-h-screen flex-col px-6 pb-8">
      <PageHeader title="Autostart" />

      <h1 className="mt-8 text-[length:var(--text-title)] font-medium leading-snug">
        One more step, and it decides the rest
      </h1>

      <p className="mt-4 text-[var(--color-ash)]">
        Your phone is made by {vendor.label}. {vendor.label} shuts down apps
        running in the background — including the one watching your sleep.
      </p>
      <p className="mt-3 text-[var(--color-ash)]">
        Without this, monitoring can stop in the middle of the night with no
        warning at all.
      </p>

      <Button
        size="lg"
        register="system"
        className="mt-8"
        onClick={openSettings}
      >
        Open {vendor.label} settings
        <ChevronRight className="size-4" strokeWidth={2} />
      </Button>

      <p className="mt-8 text-[var(--color-ash)]">
        On the screen that opens, find RePulse and turn on:
      </p>
      <ul className="mt-3 space-y-2">
        {vendor.toggles.map((t) => (
          <li
            key={t}
            className="flex items-center gap-3 text-[var(--color-ivory)]"
          >
            <span className="size-1 rounded-full bg-[var(--color-pulse)]" />
            {t}
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      <Button
        variant="secondary"
        size="lg"
        register="system"
        disabled={!opened}
        className="mt-10"
        onClick={() => navigate("/setup-guide")}
      >
        I have turned it on
      </Button>

      {/* Stated plainly: this is a claim, not a check. Presenting it as
          verified would hide the exact failure this screen exists to
          prevent. */}
      <p className="mt-4 text-center text-[length:var(--text-meta)] text-[var(--color-ash-dim)]">
        RePulse cannot check this setting. Android does not expose it.
      </p>

      <button
        onClick={() => navigate("/setup-guide")}
        className="label mt-6 self-center text-[var(--color-ash)]"
      >
        Skip — I understand the risk
      </button>
    </div>
  );
}
