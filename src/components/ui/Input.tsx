import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-12 min-w-0 w-full rounded-xl border border-brick-edge bg-night px-3 py-3 text-base text-text outline-none focus:border-neon-cyan focus:shadow-[0_0_12px_rgba(62,224,255,0.25)] ${className}`}
      {...props}
    />
  );
}
