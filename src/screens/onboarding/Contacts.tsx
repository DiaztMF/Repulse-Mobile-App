import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, X, Check } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type Contact = { name: string; phone: string; relation: string };

const RELATIONS = ["Parent", "Sibling", "Partner", "Child", "Friend", "Other"];

const empty = (): Contact => ({ name: "", phone: "", relation: "Parent" });

const CONTACTS_KEY = "repulse_emergency_contacts";

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
  const location = useLocation();
  const isOnboarding = location.pathname.startsWith("/onboarding");

  const [list, setList] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem(CONTACTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    // One blank row, never a worked example. The placeholders below read
    // "Sari" and a phone number; seeding them as values makes a filled
    // form out of an empty one, and Save then accepts it. Nobody would be
    // called. An emergency contact list is the one place a default is
    // worse than nothing.
    return [empty()];
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [bad, setBad] = useState<"name" | "phone" | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const set = (i: number, patch: Partial<Contact>) => {
    setBad(null);
    setSavedSuccess(false);
    setList((l) => l.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  };

  /**
   * DESIGN.md §7.1a — the button is live and the input is judged on the
   * tap, so the screen can say which line is missing instead of going
   * grey and leaving the user to work it out.
   *
   * The complaint always lands on the first card: if nothing here is
   * usable, that is the one they started filling in.
   */
  const save = () => {
    if (list.some(usable)) {
      try {
        localStorage.setItem(CONTACTS_KEY, JSON.stringify(list));
      } catch {
        // ignore write errors
      }

      if (isOnboarding) {
        return navigate("/ready");
      } else {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        return;
      }
    }

    const first = list[0]!;
    if (first.name.trim().length > 1) {
      setBad("phone");
      phoneRef.current?.focus();
    } else {
      setBad("name");
      nameRef.current?.focus();
    }
  };

  return (
    <div className="bg-setup flex min-h-screen flex-col pb-8">
      <PageHeader sample={false} title="Emergency contacts" showMenu={!isOnboarding} />

      <div className="flex flex-1 flex-col px-6">
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
              ref={i === 0 ? nameRef : undefined}
              label="Name"
              placeholder="Sari"
              value={c.name}
              onChange={(e) => set(i, { name: e.target.value })}
              error={i === 0 && bad === "name" ? "Add their name." : undefined}
            />
            <Field
              ref={i === 0 ? phoneRef : undefined}
              label="WhatsApp number"
              inputMode="tel"
              placeholder="0812 3456 7890"
              value={c.phone}
              onChange={(e) => set(i, { phone: e.target.value })}
              error={
                i === 0 && bad === "phone"
                  ? "A WhatsApp number, at least nine digits."
                  : undefined
              }
            />
            <label className="block">
              <span className="label text-[var(--color-ash)]">Relationship</span>
              <select
                value={c.relation}
                onChange={(e) => set(i, { relation: e.target.value })}
                // Matches Field: no box, one hairline, Ash Dim to Lamp
                // Amber on focus. DESIGN.md §7.5 — it sat between two
                // underlined inputs still wearing the old boxed style.
                className="mt-2 h-12 w-full border-b border-[var(--color-ash-dim)] bg-transparent text-[length:var(--text-body)] text-[var(--color-ivory)] outline-none focus:border-[var(--color-pulse)]"
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
        Nothing goes out on its own. This message waits for one tap from you.
      </p>

      <div className="flex-1" />

      {savedSuccess && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-pulse)]/20 border border-[var(--color-pulse)] p-3 text-[var(--color-pulse)] text-[length:var(--text-meta)]">
          <Check className="size-4" strokeWidth={2.5} />
          <span>Emergency contacts saved</span>
        </div>
      )}

      <Button size="lg" register="system" className="mt-6" onClick={save}>
        {savedSuccess ? "Saved" : "Save"}
      </Button>
      </div>
    </div>
  );
}
