import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";
import { useAuth } from "@/firebase/auth";
import { finish } from "@/firebase/onboarding";
import { useMonitor } from "@/state/monitor";
import { readBaseline } from "@/lib/baseline";

/** Whatever O9 actually saved. This row is the escalation ladder's last
 *  rung: naming someone the user never entered tells them help will reach
 *  a person it will not. */
function savedContact(): string | null {
  try {
    const raw = localStorage.getItem("repulse_emergency_contacts");
    if (!raw) return null;
    const list = JSON.parse(raw) as { name?: string }[];
    const names = list.map((c) => c?.name?.trim()).filter(Boolean);
    return names.length ? names.join(", ") : null;
  } catch {
    return null;
  }
}

/**
 * O10 — Ready. The last line matters more than the checklist: if the
 * user leaves onboarding still believing they must press something every
 * night, the sunset sequence will never run.
 */
export function Ready() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { links, bandStatus } = useMonitor();
  const contact = savedContact();

  /* Every row here was a placeholder: a band serial nobody owns, 87%, and
   * a resting pulse of 62 — which is the stand-in constant, printed as
   * though it had been measured. §3.1 measures every personal threshold
   * for a fortnight against that figure, so a screen headed "Everything is
   * ready" claiming it exists when calibration never ran is the worst
   * place in the app to invent a number. */
  const baseline = readBaseline();
  const bandUp = links.band === "connected";
  const battery = bandStatus?.percent;

  const DONE = [
    {
      title: "Band",
      detail: bandUp
        ? battery != null
          ? `Connected · ${battery}%`
          : "Connected"
        : "Not connected",
      ok: bandUp,
    },
    {
      title: "Bedside unit",
      detail: links.bedside === "connected" ? "Connected" : "Not connected",
      ok: links.bedside === "connected",
    },
    /* Kept, and now with a way out of it.
     *
     * Menghapusnya memang menghilangkan tanda X, dan itu justru bahayanya:
     * angka ini adalah pembanding SETIAP ambang alarm (§3.1). Nol yang
     * tidak diketahui berarti gelang memakai 62 bpm milik orang asing dan
     * membunyikan alarm sepanjang malam pada tubuh yang sehat. Barisnya
     * bukan keluhan kosmetik, ia satu-satunya tempat orang diberi tahu.
     *
     * Yang SALAH sebelumnya adalah jalan buntunya: kalibrasi sekarang bisa
     * dilewati, jadi X ini muncul untuk hampir semua orang, di layar yang
     * tidak menawarkan apa pun untuk memperbaikinya. */
    {
      title: "Your resting pulse",
      detail: baseline != null ? `${baseline} bpm` : "Not measured yet",
      ok: baseline != null,
      to: "/calibration",
      cta: "Measure it now",
    },
    {
      title: "Emergency contact",
      detail: contact ?? "None saved, add one before tonight",
      ok: contact !== null,
      to: "/onboarding/contacts",
      cta: "Add a contact",
    },
  ];

  return (
    <div className="bg-setup flex min-h-screen flex-col px-6 pb-8 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
      <h1 className="text-[length:var(--text-title)] font-medium">
        Everything is ready
      </h1>

      <div className="mt-8 divide-y divide-[var(--color-ash-dim)]/25 rounded-[var(--radius-card)] bg-[var(--color-surface)]">
        {DONE.map((d) => (
          <div key={d.title} className="flex items-start gap-3 p-5">
            <span
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
              style={{
                background:
                  d.ok === false
                    ? "var(--color-band-poor)"
                    : "var(--color-pulse)",
              }}
            >
              {d.ok === false ? (
                <X className="size-3.5 text-[var(--color-base)]" strokeWidth={3} />
              ) : (
                <Check className="size-3.5 text-[var(--color-base)]" strokeWidth={3} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[length:var(--text-card)] font-medium">
                {d.title}
              </p>
              <p className="mt-0.5 text-[length:var(--text-meta)] text-[var(--color-ash)]">
                {d.detail}
              </p>
              {/* Only where there is something to do about it. A band that
                  is switched off fixes itself the moment it is switched
                  on; a pulse nobody measured never does. */}
              {d.ok === false && d.to && (
                <button
                  onClick={() => navigate(d.to)}
                  className="label mt-2 text-[var(--color-pulse)]"
                >
                  {d.cta}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Promised a sunset at 21:40 and a wake window at 06:00, and built
          neither. Somebody reading this went to bed expecting the lamp to
          dim by itself, and it never did — the last screen of setup is the
          worst place to be wrong about what the product does. */}
      <p className="mt-8 text-[var(--color-ash)]">
        When you are ready for bed, tap Start sleep. The lamp dims to dark
        and the night is recorded from that tap. Nothing happens on a
        schedule. You decide when the night begins.
      </p>

      <div className="flex-1" />

      <Button
        size="lg"
        register="system"
        className="mt-10"
        // The only place onboarding is marked finished, so the splash
        // stops resuming into it. Not awaited: the write is a
        // convenience and must not hold up the last tap of setup.
        onClick={() => {
          if (user) void finish(user.uid);
          navigate("/tonight", { replace: true });
        }}
      >
        Done
      </Button>

      <p className="label mt-6 text-center text-[var(--color-ash)]">
        {COPY.disclaimer}
      </p>
    </div>
  );
}
