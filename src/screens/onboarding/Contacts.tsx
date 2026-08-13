import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type Contact = { name: string; phone: string; relation: string };

const RELATIONS = ["Parent", "Sibling", "Partner", "Child", "Friend", "Other"];

const empty = (): Contact => ({ name: "", phone: "", relation: "Parent" });

/** Indonesian numbers, written the way people actually type them. */
const usable = (c: Contact) =>
  c.name.trim().length > 1 && c.phone.replace(/\D/g, "").length >= 9;

/**
 * O9 — Emergency contacts. Moved out of settings and into onboarding
 * because the escalation ladder means nothing without a destination:
 * burying it would let the first night run with the core feature dead.
 */
export function Contacts() {
  const navigate = useNavigate();
  const [list, setList] = useState<Contact[]>([empty()]);

  const set = (i: number, patch: Partial<Contact>) =>
    setList((l) => l.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const ready = list.some(usable);

  return (
    <div className="bg-setup flex min-h-screen flex-col px-6 pb-8">
      <TopBar title="Emergency contacts" />

      <h1 className="mt-8 text-[length:var(--text-title)] font-medium leading-snug">
        Who do we reach if something happens?
      </h1>
      <p className="mt-3 text-[var(--color-ash)]">
        At least one person. Without this, an alert has nowhere to go.
      </p>

      <div className="mt-8 space-y-6">
        {list.map((c, i) => (
          <div
            key={i}
            className="space-y-5 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5"
          >
            {i > 0 && (
              <button
                onClick={() => setList((l) => l.filter((_, j) => j !== i))}
                aria-label="Remove contact"
                className="ml-auto flex text-[var(--color-ash)]"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            )}
            <Field
              label="Name"
              placeholder="Sari"
              value={c.name}
              onChange={(e) => set(i, { name: e.target.value })}
            />
            <Field
              label="WhatsApp number"
              inputMode="tel"
              placeholder="0812 3456 7890"
              value={c.phone}
              onChange={(e) => set(i, { phone: e.target.value })}
            />
            <label className="block">
              <span className="label text-[var(--color-ash)]">Relationship</span>
              <select
                value={c.relation}
                onChange={(e) => set(i, { relation: e.target.value })}
                className="mt-2 h-12 w-full rounded-t-[var(--radius-control)] border-b-2 border-[var(--color-ivory)] bg-[var(--color-ivory)]/[0.04] px-3 text-[length:var(--text-body)] text-[var(--color-ivory)] outline-none"
              >
                {RELATIONS.map((r) => (
                  <option key={r} value={r} className="bg-[var(--color-surface)]">
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>

      {list.length < 3 && (
        <button
          onClick={() => setList((l) => [...l, empty()])}
          className="mt-5 flex items-center gap-2 self-start text-[var(--color-pulse)]"
        >
          <Plus className="size-4" strokeWidth={2} />
          <span className="label">Add another contact</span>
        </button>
      )}

      <div className="mt-10 h-px bg-[var(--color-ash-dim)]/30" />

      {/* Shown before the system is agreed to, not after. People are
          entitled to see exactly what will go out in their name. */}
      <p className="label mt-8 text-[var(--color-ash)]">What they receive</p>
      <div className="mt-3 rounded-[var(--radius-card)] bg-[var(--color-raised)] p-5 text-[var(--color-ivory)]">
        <p>Andi may need help.</p>
        <p className="mt-1">Detected at 02:16.</p>
        <p className="mt-1 text-[var(--color-ash)]">
          Location: maps.google.com/…
        </p>
      </div>
      <p className="mt-4 text-[length:var(--text-meta)] text-[var(--color-ash)]">
        Nothing is sent automatically. This message waits for one tap from you.
      </p>

      <div className="flex-1" />

      <Button
        size="lg"
        register="system"
        disabled={!ready}
        className="mt-10"
        onClick={() => navigate("/ready")}
      >
        Save
      </Button>
    </div>
  );
}
