import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { ForegroundService } from "@capawesome-team/capacitor-android-foreground-service";
import { BatteryOptimization } from "@capawesome-team/capacitor-android-battery-optimization";
import { RepulseMonitor } from "repulse-monitor";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Permission = {
  id: string;
  title: string;
  why: string;
  action: string;
};

/** Each entry says what breaks without it. Android's own dialogs give
 *  no context, so this screen is the only place the user learns why. */
const PERMISSIONS: Permission[] = [
  {
    id: "notifications",
    title: "Notifications",
    why: "So the SOS screen can appear, and so monitoring is allowed to keep running once the screen is off.",
    action: "Allow",
  },
  {
    id: "bluetooth",
    title: "Bluetooth & location",
    why: "Finds the band and the bedside unit. Android requires location permission to scan for Bluetooth.",
    action: "Allow",
  },
  {
    id: "battery",
    title: "Ignore battery optimisation",
    why: "Without this, Android kills RePulse during Doze and monitoring stops in the middle of the night.",
    action: "Open settings",
  },
];

/**
 * What each row actually asks Android, and how it reads the answer back.
 *
 * Split from the copy above because these are the load-bearing half: for
 * most of this project the screen kept its own `granted` map and ticked it
 * on tap, so it showed three green checks on a phone that had granted
 * nothing. A permissions screen that cannot be wrong is not a permissions
 * screen, it is a picture of one.
 *
 * Battery optimisation is not a runtime permission and has no dialog to
 * await — it opens Settings and the person may come back having done
 * nothing, or having done it minutes later. So nothing here trusts what a
 * request returned; every answer is read back from the system.
 */
const ASK: Record<string, { check: () => Promise<boolean>; request: () => Promise<unknown> }> = {
  notifications: {
    check: async () => (await ForegroundService.checkPermissions()).display === "granted",
    request: () => ForegroundService.requestPermissions(),
  },
  bluetooth: {
    check: async () => (await RepulseMonitor.checkPermissions()).nearby === "granted",
    request: () => RepulseMonitor.requestPermissions(),
  },
  battery: {
    // Inverted on purpose: the system answers "is optimisation on", and
    // what this screen needs is "are we exempt".
    check: async () => !(await BatteryOptimization.isBatteryOptimizationEnabled()).enabled,
    request: () => BatteryOptimization.requestIgnoreBatteryOptimization(),
  },
};

/**
 * O3 — System permissions. Requested one at a time, never in a burst:
 * a stack of dialogs with no explanation is how people learn to tap
 * "deny" reflexively.
 *
 * In a browser there is no Android to ask, and the whole flow still has to
 * be walkable there — so off-device the buttons tick as they always did,
 * and say so.
 */
export function Permissions() {
  const navigate = useNavigate();
  const native = Capacitor.isNativePlatform();
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!native) return;
    const rows = await Promise.all(
      PERMISSIONS.map(async (p) => {
        try {
          return [p.id, await ASK[p.id]!.check()] as const;
        } catch (e) {
          // A plugin that cannot answer is not a grant. Saying "allowed"
          // here is the same lie the old screen told, arrived at politely.
          console.error(`[permissions] ${p.id} unreadable`, e);
          return [p.id, false] as const;
        }
      }),
    );
    setGranted(Object.fromEntries(rows));
  }, [native]);

  // Read on arrival, and again whenever the app comes back to the front.
  // The battery row leaves for Settings and returns with no result of its
  // own, so this is the only way its answer ever arrives.
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
      await ASK[id]!.request();
    } catch (e) {
      // A refusal is an answer, not a crash. The row simply stays open.
      console.error(`[permissions] ${id} refused`, e);
    } finally {
      setBusy(null);
      await refresh();
    }
  };

  const done = PERMISSIONS.filter((p) => granted[p.id]).length;
  const all = done === PERMISSIONS.length;

  return (
    <div className="bg-setup flex min-h-screen flex-col pb-8">
      <PageHeader
        title="Permissions needed"
        right={`${done}/${PERMISSIONS.length}`}
      />

      <div className="flex flex-1 flex-col px-6">
        <p className="mt-8 text-[length:var(--text-title)] font-medium leading-snug">
        RePulse watches all night
      </p>
      <p className="mt-3 text-[var(--color-ash)]">
        Without the permissions below, monitoring stops on its own once the screen goes dark.
      </p>

      {/* §12's rule applied to permissions: a browser has none of these to
          grant, and a screen showing three green checks there would be
          claiming a phone is ready when no phone is involved. */}
      {!native && (
        <p className="label mt-3 text-[var(--color-ash-dim)]">
          Browser preview, nothing here is really granted
        </p>
      )}

      <div className="mt-8 space-y-3">
        {PERMISSIONS.map((p) => {
          const ok = !!granted[p.id];
          return (
            <section
              key={p.id}
              className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                    ok
                      ? "border-[var(--color-pulse)] bg-[var(--color-pulse)]"
                      : "border-[var(--color-ash-dim)]",
                  )}
                >
                  {ok && (
                    <Check
                      className="size-3.5 text-[var(--color-base)]"
                      strokeWidth={3}
                    />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="text-[length:var(--text-card)] font-medium">
                    {p.title}
                  </h2>
                  <p className="mt-1 text-[length:var(--text-meta)] text-[var(--color-ash)]">
                    {p.why}
                  </p>
                </div>
              </div>

              {/* Compact and right-aligned. Three full-width pills stacked
                  turn the screen into a wall of buttons. */}
              <div className="mt-3 flex justify-end">
                {ok ? (
                  <span className="label text-[var(--color-pulse)]">
                    Allowed
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    register="system"
                    disabled={busy === p.id}
                    className="h-9 w-auto px-5 text-[length:var(--text-label)]"
                    onClick={() => void grant(p.id)}
                  >
                    {busy === p.id ? "Asking…" : p.action}
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex-1" />

      <Button
        size="lg"
        register="system"
        disabled={!all}
        className="mt-10"
        onClick={() => navigate("/permissions/autostart")}
      >
        Continue
      </Button>

      {/* Escape hatch, deliberately plain, and gone once there is
          nothing left to skip. The wording names the consequence
          instead of softening it. */}
      {!all && (
        <button
          onClick={() => navigate("/permissions/autostart")}
          className="label mt-5 self-center text-[var(--color-ash)]"
        >
          Skip for now, this is risky
        </button>
      )}
      </div>
    </div>
  );
}
