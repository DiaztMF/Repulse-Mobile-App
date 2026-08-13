import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Primary actions are outlined pills with a transparent fill, not
 * filled buttons. Filled is the default every generator reaches for,
 * which is exactly why it reads as templated.
 *
 * There is no filled-accent variant. Only `sos` and `inverse` are filled.
 */
const button = cva(
  [
    "inline-flex w-full items-center justify-center gap-2",
    "rounded-[var(--radius-pill)] border px-6",
    "font-medium transition-transform duration-150",
    "active:translate-y-px",
    "disabled:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-[var(--color-pulse)] text-[var(--color-pulse)] bg-transparent",
        secondary:
          "border-[var(--color-ivory)]/60 text-[var(--color-ivory)] bg-transparent",
        ghost: "border-transparent text-[var(--color-pulse)] bg-transparent",

        /** Light pill on dark. One per screen, and never during a
         *  sleep session — it's a small spotlight in a dark room. */
        inverse:
          "border-transparent bg-[var(--color-ivory)] text-[var(--color-base)]",

        /** The only color-filled button in the app, and the tallest. */
        sos: "border-transparent bg-[var(--color-danger)] text-white h-16 text-[length:var(--text-card)]",
      },
      size: {
        md: "h-12 text-[length:var(--text-body)]",
        lg: "h-14 text-[length:var(--text-card)]",
      },
      /** Uppercase when the button commands the machine, sentence case
       *  when it offers a choice. */
      register: {
        content: "",
        system: "uppercase tracking-[var(--tracking-label)]",
      },
    },
    defaultVariants: { variant: "primary", size: "md", register: "content" },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export function Button({
  className,
  variant,
  size,
  register,
  disabled,
  ...props
}: Props) {
  return (
    <button
      disabled={disabled}
      className={cn(
        button({ variant, size, register }),
        // Disabled always reads grey regardless of variant. The turn
        // to accent is how the user learns the input is valid — no
        // validation copy needed.
        disabled &&
          "border-[var(--color-ash-dim)]/40 bg-transparent text-[var(--color-ash-dim)]",
        className,
      )}
      {...props}
    />
  );
}
