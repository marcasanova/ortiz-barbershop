import type { ReactNode } from "react";

// Franja lateral de color: marca "algo tuyo" (lima), "te piden algo" (cian)
// o "algo pendiente" (texto) sin meterlo en otra tarjeta igual a las demás.
const TONES = {
  lime: "before:bg-neon-lime before:shadow-[0_0_10px_rgba(200,255,58,0.55)]",
  cyan: "before:bg-neon-cyan before:shadow-[0_0_10px_rgba(62,224,255,0.55)]",
  muted: "before:bg-brick-edge",
} as const;

export function Rail({
  tone,
  label,
  action,
  children,
  className = "",
}: {
  tone: keyof typeof TONES;
  // Nombre accesible de la región (no se pinta).
  label: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={label}
      className={`relative flex items-center gap-3 py-3 pr-1 pl-4 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full ${TONES[tone]} ${className}`}
    >
      <div className="min-w-0 flex-1 leading-snug">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}
