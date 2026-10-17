import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "cyan" | "danger" | "lime";
type Size = "md" | "sm";

const variants: Record<Variant, string> = {
  primary:
    "bg-neon-pink text-on-neon shadow-[0_0_18px_rgba(255,45,138,0.35)] hover:bg-neon-magenta hover:shadow-[0_0_24px_rgba(255,45,138,0.5)]",
  ghost:
    "bg-transparent text-text-dim border border-brick-edge hover:text-text hover:border-mortar",
  cyan: "bg-transparent text-neon-cyan border border-neon-cyan/70 hover:bg-neon-cyan/10 shadow-[0_0_12px_rgba(62,224,255,0.2)]",
  danger:
    "bg-transparent text-neon-orange border border-neon-orange/60 hover:bg-neon-orange/10",
  lime: "bg-neon-lime text-on-neon shadow-[0_0_18px_rgba(200,255,58,0.35)]",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-4 py-3 text-base",
  sm: "min-h-11 px-3 py-2 text-sm",
};

export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-night";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold touch-manipulation transition-[transform,box-shadow,background-color] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${focusRing} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-text-dim touch-manipulation hover:bg-brick-edge/50 hover:text-text active:scale-95 disabled:opacity-50 ${focusRing} ${className}`}
      {...props}
    />
  );
}
