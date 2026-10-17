import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "cyan" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-neon-pink text-on-neon shadow-[0_0_18px_rgba(255,45,138,0.35)] hover:bg-neon-magenta",
  ghost:
    "bg-transparent text-text-dim border border-brick-edge hover:text-text hover:border-mortar",
  cyan: "bg-transparent text-neon-cyan border border-neon-cyan/70 hover:bg-neon-cyan/10 shadow-[0_0_12px_rgba(62,224,255,0.2)]",
  danger:
    "bg-transparent text-neon-orange border border-neon-orange/60 hover:bg-neon-orange/10",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center rounded-2xl px-4 py-3 text-base font-semibold touch-manipulation disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
