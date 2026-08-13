import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Faint fill plus a bright underline. The fill gives the tap target a
 * shape on a dark screen; the underline gives it direction. A boxed
 * input would make every form look like every other form.
 */
export function Field({
  label,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="label text-[var(--color-ash)]">{label}</span>
      <input
        className={cn(
          "mt-2 h-12 w-full px-3 outline-none",
          "rounded-t-[var(--radius-control)] bg-[var(--color-ivory)]/[0.04]",
          "border-b-2 text-[length:var(--text-body)] text-[var(--color-ivory)]",
          "placeholder:text-[var(--color-ash-dim)]",
          "select-text", // the only place text may be selected
          error
            ? "border-[var(--color-breath)]"
            : "border-[var(--color-ivory)] focus:border-[var(--color-pulse)]",
        )}
        {...props}
      />
      {error && (
        <span className="mt-1.5 block text-[length:var(--text-meta)] text-[var(--color-breath)]">
          {error}
        </span>
      )}
    </label>
  );
}
