import Image from "next/image";

export function Header({ compact = false }: { compact?: boolean }) {
  return (
    <header className="flex flex-col items-center gap-2 px-4 pt-5 pb-3 sm:pt-8 sm:pb-4">
      <Image
        src="/brand/logo-neon.jpg"
        alt="Ortiz Barbershop"
        width={compact ? 220 : 320}
        height={compact ? 220 : 320}
        className={`h-auto w-full rounded-2xl ${compact ? "max-w-[180px] sm:max-w-[220px]" : "max-w-xs"}`}
        priority
      />
      <p className="font-display text-sm uppercase text-neon-pink">Ortiz</p>
    </header>
  );
}
