import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { RepulseMonitor } from "repulse-monitor";
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
  oneplus: { label: "OnePlus", toggles: ["Auto-launch", "Allow background activity"] },
  huawei: { label: "Huawei", toggles: ["Auto-launch", "Manage manually"] },
  honor: { label: "Honor", toggles: ["Auto-launch", "Manage manually"] },
  samsung: { label: "Samsung", toggles: ["Allow background activity"] },
};

/**
 * A phone whose settings screen we can open but whose toggle names we do
 * not know. Naming the wrong toggle is worse than naming none — an
 * instruction that does not match what is on the screen teaches people to
 * distrust the rest of the setup — so this names none and describes the
 * outcome instead.
 */
const UNKNOWN = { label: "", toggles: [] as string[] };

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
  const [vendor, setVendor] = useState<{ label: string; toggles: string[] } | null>(null);

  // Asked of the phone, not inferred from a name. The manufacturer only
  // chooses the wording; whether this screen appears at all is decided by
  // whether one of the vendor activities actually resolves here. A stock
  // phone resolves none and is skipped, which is what should have
  // happened before instead of showing an Oppo owner a Xiaomi button.
  useEffect(() => {
    let live = true;
    const decide = async () => {
      if (!Capacitor.isNativePlatform()) return null;
      try {
        const { manufacturer, available } = await RepulseMonitor.autostart();
        if (!available) return null;
        return VENDORS[manufacturer.toLowerCase()] ?? UNKNOWN;
      } catch (e) {
        // Skipping costs a step that may have been needed. Showing the
        // wrong vendor's instructions costs the trust that carries the
        // rest of setup.
        console.error("[autostart] unavailable", e);
        return null;
      }
    };
    void decide().then((v) => {
      if (!live) return;
      if (!v) navigate("/setup-guide", { replace: true });
      else setVendor(v);
    });
    return () => {
      live = false;
    };
  }, [navigate]);

  if (!vendor) return null;

  const openSettings = async () => {
    try {
      const { opened: did } = await RepulseMonitor.openAutostart();
      setOpened(did);
    } catch (e) {
      console.error("[autostart] could not open settings", e);
    }
  };

  return (
    <div className="bg-setup flex min-h-screen flex-col pb-8">
      <PageHeader title="Autostart" />

      <div className="flex flex-1 flex-col px-6">
        <h1 className="mt-8 text-[length:var(--text-title)] font-medium leading-snug">
        One more step, and it decides the rest
      </h1>

      <p className="mt-4 text-[var(--color-ash)]">
        {vendor.label
          ? `Your phone is made by ${vendor.label}. ${vendor.label} shuts down apps running in the background — including the one watching your sleep.`
          : "Your phone shuts down apps running in the background — including the one watching your sleep."}
      </p>
      <p className="mt-3 text-[var(--color-ash)]">
        Without this, monitoring can stop in the middle of the night with no
        warning at all.
      </p>

      <Button
        size="lg"
        register="system"
        className="mt-8"
        onClick={() => void openSettings()}
      >
        {vendor.label ? `Open ${vendor.label} settings` : "Open settings"}
        <ChevronRight className="size-4" strokeWidth={2} />
      </Button>

      <p className="mt-8 text-[var(--color-ash)]">
        {vendor.toggles.length
          ? "On the screen that opens, find RePulse and turn on:"
          : "On the screen that opens, find RePulse and allow it to keep running in the background."}
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
    </div>
  );
}
