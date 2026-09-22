import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { ForegroundService } from "@capawesome-team/capacitor-android-foreground-service";
import { BatteryOptimization } from "@capawesome-team/capacitor-android-battery-optimization";
import { RepulseMonitor } from "repulse-monitor";

/**
 * Every system permission this product needs, in one place, because there
 * are now two screens that have to agree about them: O3 asks for them once
 * during setup, and Settings has to be able to show the truth months later
 * on a phone where somebody revoked one from the Android settings app.
 *
 * Two screens with two copies of this list is how they drift apart, and the
 * way that failure shows up is a Settings screen full of green ticks on a
 * phone that cannot send an SOS.
 */

export type Ask = {
  id: string;
  title: string;
  /** What breaks without it. Android's own dialogs say nothing useful. */
  why: string;
  action: string;
  check: () => Promise<boolean>;
  request: () => Promise<unknown>;
};

export const ASKS: Ask[] = [
  {
    id: "notifications",
    title: "Notifications",
    why: "So the SOS screen can appear, and so monitoring is allowed to keep running once the screen is off.",
    action: "Allow",
    check: async () => (await ForegroundService.checkPermissions()).display === "granted",
    request: () => ForegroundService.requestPermissions(),
  },
  {
    id: "bluetooth",
    title: "Nearby devices",
    why: "Finds the band and the bedside unit over Bluetooth.",
    action: "Allow",
    check: async () => (await RepulseMonitor.checkPermissions()).nearby === "granted",
    request: () => RepulseMonitor.requestPermissions({ permissions: ["nearby"] }),
  },
  {
    id: "location",
    title: "Location",
    why: "Puts your actual coordinates in the emergency message. Without it the message says the location is unavailable and whoever reads it has to guess where you are.",
    action: "Allow",
    check: async () => (await Geolocation.checkPermissions()).location === "granted",
    request: () => Geolocation.requestPermissions(),
  },
  {
    id: "sms",
    title: "Send SMS",
    why: "The emergency message leaves the phone by itself, by SMS. Refuse this and somebody has to unlock the phone and send it by hand.",
    action: "Allow",
    check: async () => (await RepulseMonitor.checkPermissions()).sms === "granted",
    request: () => RepulseMonitor.requestPermissions({ permissions: ["sms"] }),
  },
  {
    id: "battery",
    title: "Ignore battery optimisation",
    why: "Without this, Android kills RePulse during Doze and monitoring stops in the middle of the night.",
    action: "Open settings",
    // Inverted on purpose: the system answers "is optimisation on", and
    // what these screens need is "are we exempt".
    check: async () => !(await BatteryOptimization.isBatteryOptimizationEnabled()).enabled,
    request: () => BatteryOptimization.requestIgnoreBatteryOptimization(),
  },
];

/**
 * The live state of those permissions, read back from the system rather
 * than remembered from what a request returned.
 *
 * Nothing here trusts a tap. Battery optimisation has no dialog to await —
 * it opens Settings and the person may come back having done nothing — and
 * any permission can be revoked later from outside the app, which is the
 * whole reason Settings shows this list at all.
 */
export function usePermissions() {
  const native = Capacitor.isNativePlatform();
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!native) return;
    const rows = await Promise.all(
      ASKS.map(async (a) => {
        try {
          return [a.id, await a.check()] as const;
        } catch (e) {
          // A plugin that cannot answer is not a grant. Saying "allowed"
          // here is a lie arrived at politely.
          console.error(`[permissions] ${a.id} unreadable`, e);
          return [a.id, false] as const;
        }
      }),
    );
    setGranted(Object.fromEntries(rows));
  }, [native]);

  // Read on arrival, and again whenever the app comes back to the front:
  // the battery row and any trip to Android's settings return with no
  // result of their own.
  useEffect(() => {
    void refresh();
    const onShow = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [refresh]);

  const grant = async (id: string) => {
    if (!native) {
      setGranted((g) => ({ ...g, [id]: true }));
      return;
    }
    setBusy(id);
    try {
      await ASKS.find((a) => a.id === id)?.request();
    } catch (e) {
      // A refusal is an answer, not a crash. The row simply stays open.
      console.error(`[permissions] ${id} refused`, e);
    } finally {
      setBusy(null);
      await refresh();
    }
  };

  return {
    native,
    granted,
    busy,
    grant,
    refresh,
    done: ASKS.filter((a) => granted[a.id]).length,
    all: ASKS.every((a) => granted[a.id]),
  };
}
