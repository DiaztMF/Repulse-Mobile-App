import { useState } from "react";
import { X, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";

const INITIAL = [{ name: "Sari", since: "added 4 Aug" }];

/**
 * D5 — Family. One account can both wear a band and watch someone else,
 * so this grants a view rather than creating a different kind of user.
 */
export function Family() {
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);
  const [viewers, setViewers] = useState(INITIAL);

  return (
    <div className="pb-8">
      <PageHeader title="Family" showMenu />

      <div className="px-5">
        <p className="text-[var(--color-ash)]">
          People you invite see last night's summary and any alerts. They never
          see raw readings, and they can never cancel an alert on your behalf.
        </p>

        <h2 className="label mt-8 text-[var(--color-ash)]">Who can see you</h2>
        {viewers.length === 0 && (
          <p className="mt-3 text-[var(--color-ash)]">Nobody yet.</p>
        )}
        <ul className="mt-3 space-y-2">
          {viewers.map((v) => (
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
              <button
                onClick={() => setViewers((l) => l.filter((x) => x.name !== v.name))}
                aria-label={`Remove ${v.name}`}
                className="text-[var(--color-ash)]"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>

        {/* The other half of the feature: this account can also watch
            someone else, so there has to be a way into that view. */}
        <h2 className="label mt-10 text-[var(--color-ash)]">People you watch</h2>
        <button
          onClick={() => navigate("/family/view")}
          className="mt-3 flex w-full items-center justify-between gap-4 rounded-[var(--radius-control)] bg-[var(--color-surface)] px-4 py-4 text-left"
        >
          <span>
            <span className="block">Sari</span>
            <span className="mt-0.5 block text-[length:var(--text-meta)] text-[var(--color-ash)]">
              Summaries and alerts only
            </span>
          </span>
          <ChevronRight className="size-5 text-[var(--color-ash)]" strokeWidth={1.5} />
        </button>

        <h2 className="label mt-10 text-[var(--color-ash)]">Invite</h2>
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
