import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Label above, no box, one hairline underneath. DESIGN.md §7.5 — a boxed
 * input with its own fill is the default that makes every form look like
 * every other form, and the earlier version had drifted into exactly that.
 *
 * The line is the whole state machine: Ash Dim at rest, Lamp Amber on
 * focus, Kiln Clay on error. It doubles as the keyboard focus indicator,
 * which §6.11 requires and §4.5 will not let be a coloured ring.
 */
export function Field({
  label,
  error,
  className,
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);

  // Six characters typed blind, in the dark, on a screen that will create
  // the account from whatever was typed. WIREFRAME.md §1 draws the eye.
  const secret = type === "password";

  return (
    <div className={cn("block", className)}>
      <label htmlFor={id} className="label text-[var(--color-ash)]">
        {label}
      </label>

      <div className="relative mt-2">
        <input
          id={id}
          type={secret && shown ? "text" : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "h-12 w-full outline-none",
            "border-b bg-transparent text-[length:var(--text-body)] text-[var(--color-ivory)]",
            "placeholder:text-[var(--color-ash-dim)]",
            "select-text", // the only place text may be selected
            secret && "pr-12",
            error
              ? "border-[var(--color-breath)]"
              : "border-[var(--color-ash-dim)] focus:border-[var(--color-pulse)]",
          )}
          {...props}
        />

        {secret && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide password" : "Show password"}
            // 44px of reach on an 18px icon — DESIGN.md §6.11.
            className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-[var(--color-ash)]"
          >
            {shown ? (
              <EyeOff className="size-[18px]" strokeWidth={1.75} />
            ) : (
              <Eye className="size-[18px]" strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>

      {error && (
        <span
          id={`${id}-error`}
          className="mt-1.5 block text-[length:var(--text-meta)] text-[var(--color-breath)]"
        >
          {error}
        </span>
      )}
    </div>
  );
}
