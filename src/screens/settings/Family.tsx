import { useState } from "react";
import { X } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";

const VIEWERS = [{ name: "Sari", since: "added 4 Aug" }];

/**
 * D5 — Family. One account can both wear a band and watch someone else,
 * so this grants a view rather than creating a different kind of user.
 */
export function Family() {
  const [code, setCode] = useState<string | null>(null);

  return (
    <div className="pb-8">
      <PageHeader title="Family" />

      <div className="px-5">
        <p className="text-[var(--color-ash)]">
          People you invite see last night's summary and any alerts. They never
          see raw readings, and they can never cancel an alert on your behalf.
        </p>

        <h2 className="label mt-8 text-[var(--color-ash)]">Who can see you</h2>
        <ul className="mt-3 space-y-2">
          {VIEWERS.map((v) => (
            <li
              key={v.name}
              className="flex items-center justify-between gap-4 rounded-[var(--radius-control)] bg-[var(--color-surface)] px-4 py-4"
            >
              <span>
                <span className="block">{v.name}</span>
                <span className="mt-0.5 block text-[length:var(--text-meta)] text-[var(--color-ash)]">
                  {v.since}
                </span>
              </span>
              <button aria-label={`Remove ${v.name}`} className="text-[var(--color-ash)]">
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>

        <h2 className="label mt-8 text-[var(--color-ash)]">Invite</h2>
        {code ? (
          <div className="mt-3 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5 text-center">
            <p className="num text-[length:var(--text-metric)] tracking-[0.2em]">
              {code}
            </p>
            <p className="mt-3 text-[length:var(--text-meta)] text-[var(--color-ash)]">
              Expires in 24 hours. One use.
            </p>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            register="system"
            className="mt-3"
            onClick={() => setCode("4T9 K2M")}
          >
            Create invite code
          </Button>
        )}
      </div>
    </div>
  );
}
