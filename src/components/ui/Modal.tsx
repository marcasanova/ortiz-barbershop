import type { ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-night/80"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-brick-edge bg-brick p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-brick-edge sm:hidden" />
        <h2 className="font-display text-xl uppercase text-text">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
