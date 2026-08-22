import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { RepulseMonitor } from "repulse-monitor";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";

/**
 * Toggle names differ per vendor and naming the wrong one is worse than
 * naming none, so each entry carries the exact labels the user will see in
 * that manufacturer's settings app.
 *
 * `manual` is the same instruction for the case where the app could only
 * reach the app's own settings page. That is not a rare fallback: ColorOS
 * 15 guards its startup manager with a signature permission, so on a
 * current Oppo it is the only door that opens, and directions written for
 * a screen the person is not looking at are worse than no directions.
 */
type Vendor = { label: string; toggles: string[]; manual: string };

const VENDORS: Record<string, Vendor> = {
  /* MIUI and HyperOS need two things the other vendors do not, and both
   * are off by default.
   *
   * Autostart and battery alone keep the night recording, but they do not
   * let the alert reach the person: raising a screen over a locked phone
   * is gated behind "Display pop-up windows while running in background",
   * which sits in the app's own permission page rather than in the
   * autostart list. Without it the ladder escalates, the service is
   * running, and nothing appears — the exact silent failure the escalation
   * exists to prevent.
   *
   * The padlock in Recents is the one MIUI habit that survives everything
   * else, and it costs one gesture. */
  xiaomi: {
    label: "Xiaomi",
    toggles: [
      "Autostart",
      "No battery restrictions",
      "Display pop-up windows while running in background",
    ],
    manual:
      "Open Battery saver and choose No restrictions. Autostart lives in Settings, under Apps, Permissions, Autostart. In the same permissions page, turn on Display pop-up windows while running in background, or the alert cannot wake a locked phone. Then open Recents, swipe down on the RePulse card and tap the padlock.",
  },
  // The only entry below verified against a real phone: an Oppo CPH2819 on
  // ColorOS 15. The others are the best known wording and should be
  // checked the first time one of those phones is in the room.
  oppo: {
    label: "Oppo",
    toggles: ["Auto-launch", "Allow background activity"],
    manual: "Open Battery usage on the page that opened, then choose Allow background activity. The one it starts on, Smart mode, the recommended one, is the setting that stops monitoring at night.",
  },
  vivo: {
    label: "Vivo",
    toggles: ["Auto-start", "High background power"],
    manual: "Open Battery on the page that opened and allow high background power use.",
  },
  huawei: {
    label: "Huawei",
    toggles: ["Auto-launch", "Manage manually"],
    manual: "Open Battery on the page that opened and set app launch to Manage manually.",
  },
  samsung: {
    label: "Samsung",
    toggles: ["Allow background activity"],
    manual: "Open Battery on the page that opened and set it to Unrestricted.",
  },
};

// ColorOS answers for all three, and so do their toggle names.
VENDORS.realme = { ...VENDORS.oppo!, label: "Realme" };
VENDORS.oneplus = { ...VENDORS.oppo!, label: "OnePlus" };
VENDORS.redmi = { ...VENDORS.xiaomi! };
VENDORS.poco = { ...VENDORS.xiaomi! };
VENDORS.honor = { ...VENDORS.huawei!, label: "Honor" };

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
  const [vendor, setVendor] = useState<Vendor | null>(null);
  // Whether the button reached the vendor's own autostart list or only the
  // app's settings page. The directions below are useless if they describe
  // a screen the person is not looking at.
  const [direct, setDirect] = useState(false);

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
        const { manufacturer } = await RepulseMonitor.autostart();
        return VENDORS[manufacturer.toLowerCase()] ?? null;
      } catch (e) {
        console.error("[autostart] could not read the manufacturer", e);
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
      const { opened: did, vendor: direct } = await RepulseMonitor.openAutostart();
      setOpened(did);
      setDirect(direct);
    } catch (e) {
      console.error("[autostart] could not open settings", e);
    }
  };

  return (
    <div className="bg-setup flex min-h-screen flex-col pb-8">
      <PageHeader sample={false} title="Autostart" />

      <div className="flex flex-1 flex-col px-6">
        <h1 className="mt-8 text-[length:var(--text-title)] font-medium leading-snug">
        One more step, and it decides the rest
      </h1>

      <p className="mt-4 text-[var(--color-ash)]">
        Your phone is made by {vendor.label}. {vendor.label} shuts down apps
        running in the background, including the one watching your sleep.
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
        Open {vendor.label} settings
        <ChevronRight className="size-4" strokeWidth={2} />
      </Button>

      <p className="mt-8 text-[var(--color-ash)]">
        {!opened
          ? "The button above opens the right part of your settings."
          : direct && vendor.toggles.length
            ? "On the screen that opened, find RePulse and turn on:"
            : vendor.manual}
      </p>
      <ul className="mt-3 space-y-2">
        {opened && direct && vendor.toggles.map((t) => (
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
        Skip, I understand the risk
      </button>
      </div>
    </div>
  );
}
