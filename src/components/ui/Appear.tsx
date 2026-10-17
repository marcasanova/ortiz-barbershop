import type { ReactNode } from "react";

export function Appear({
  delayMs = 0,
  className = "",
  children,
}: {
  delayMs?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`animate-appear ${className}`}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
