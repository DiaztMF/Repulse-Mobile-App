import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ASKS, usePermissions } from "@/lib/permissions";

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
  const { native, granted, busy, grant, done, all } = usePermissions();

  return (
    <div className="bg-setup flex min-h-screen flex-col pb-8">
      <PageHeader
        sample={false}
        title="Permissions needed"
        right={`${done}/${ASKS.length}`}
      />

      <div className="flex flex-1 flex-col px-6">
        <p className="mt-8 text-[length:var(--text-title)] font-medium leading-snug">
        RePulse watches all night
      </p>
      <p className="mt-3 text-[var(--color-ash)]">
        Without the permissions below, monitoring stops on its own once the screen goes dark.
      </p>

      {/* §12's rule applied to permissions: a browser has none of these to
          grant, and a screen showing green checks there would be
          claiming a phone is ready when no phone is involved. */}
      {!native && (
        <p className="label mt-3 text-[var(--color-ash-dim)]">
          Browser preview, nothing here is really granted
        </p>
      )}

      <div className="mt-8 space-y-3">
        {ASKS.map((p) => {
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
