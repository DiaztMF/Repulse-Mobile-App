import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
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
    id: "notifikasi",
    title: "Notifikasi",
    why: "Agar layar SOS bisa muncul, dan agar pemantauan boleh berjalan saat layar mati.",
    action: "Izinkan",
  },
  {
    id: "bluetooth",
    title: "Bluetooth & lokasi",
    why: "Menemukan gelang dan bedside. Android menuntut izin lokasi untuk memindai Bluetooth.",
    action: "Izinkan",
  },
  {
    id: "baterai",
    title: "Abaikan optimasi baterai",
    why: "Tanpa ini Android mematikan RePulse saat Doze, dan pemantauan berhenti di tengah malam.",
    action: "Buka setelan",
  },
];

/**
 * O3 — System permissions. Requested one at a time, never in a burst:
 * a stack of dialogs with no explanation is how people learn to tap
 * "deny" reflexively.
 */
export function Permissions() {
  const navigate = useNavigate();
  const [granted, setGranted] = useState<Record<string, boolean>>({});

  // TODO: wire to the Capacitor permission plugins.
  const grant = (id: string) => setGranted((g) => ({ ...g, [id]: true }));

  const done = PERMISSIONS.filter((p) => granted[p.id]).length;
  const all = done === PERMISSIONS.length;

  return (
    <div className="bg-setup flex min-h-screen flex-col px-6 pb-8">
      <TopBar title="Izin yang dibutuhkan" right={`${done}/${PERMISSIONS.length}`} />

      <p className="mt-8 text-[length:var(--text-title)] font-medium leading-snug">
        RePulse memantau sepanjang malam
      </p>
      <p className="mt-3 text-[var(--color-ash)]">
        Tanpa izin di bawah, pemantauan berhenti sendiri saat layar mati.
      </p>

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
                    Diizinkan
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    register="system"
                    className="h-9 w-auto px-5 text-[length:var(--text-label)]"
                    onClick={() => grant(p.id)}
                  >
                    {p.action}
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
        onClick={() => navigate("/izin/autostart")}
      >
        Lanjutkan
      </Button>

      {/* Escape hatch, deliberately plain, and gone once there is
          nothing left to skip. The wording names the consequence
          instead of softening it. */}
      {!all && (
        <button
          onClick={() => navigate("/izin/autostart")}
          className="label mt-5 self-center text-[var(--color-ash)]"
        >
          Lewati — nanti saja, berisiko
        </button>
      )}
    </div>
  );
}
