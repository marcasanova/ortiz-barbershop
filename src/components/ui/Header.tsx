import Image from "next/image";
import type { ReactNode } from "react";

/** Logo completo: estados vacíos, enlace caducado, login. */
export function Header({ compact = false }: { compact?: boolean }) {
  return (
    <header className="flex flex-col items-center px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3 sm:pt-8 sm:pb-4">
      <Image
        src="/brand/logo-neon.jpg"
        alt="Ortiz Barbershop"
        width={compact ? 220 : 320}
        height={compact ? 220 : 320}
        className={`h-auto w-full rounded-2xl ${compact ? "max-w-[180px] sm:max-w-[220px]" : "max-w-[260px]"}`}
        priority
      />
    </header>
  );
}

/** Barra fija superior: logo + wordmark que se enciende una vez. */
export function TopBar({
  subtitle,
  action,
}: {
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 -mx-4 border-b border-brick-edge/70 bg-night/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-14 items-center gap-3">
        <Image
          src="/brand/logo-neon.jpg"
          alt=""
          width={40}
          height={40}
          className="size-10 rounded-lg border border-brick-edge object-cover"
          priority
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2">
            <span className="animate-sign-on font-sign text-[28px] text-neon-pink">
              ORTIZ
            </span>
            <span className="sr-only">Barbershop</span>
          </p>
          {subtitle ? (
            <p className="-mt-0.5 truncate text-xs text-text-dim">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}
