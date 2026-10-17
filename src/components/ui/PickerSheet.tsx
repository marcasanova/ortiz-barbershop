"use client";

import { useEffect, useRef, type ReactNode } from "react";

export const pickerTriggerClass =
  "flex min-h-12 w-full touch-manipulation items-center justify-between gap-3 rounded-xl border border-brick-edge bg-night px-3 text-left text-base text-text outline-none focus:border-neon-cyan";

export const pickerNavClass =
  "flex min-h-12 min-w-12 touch-manipulation items-center justify-center rounded-xl border border-brick-edge text-2xl text-neon-cyan";

export const pickerFooterGhostClass =
  "min-h-12 touch-manipulation rounded-xl border border-brick-edge text-base text-text-dim";

export const pickerFooterAccentClass =
  "min-h-12 touch-manipulation rounded-xl border border-neon-cyan/70 text-base font-semibold text-neon-cyan";

export function pickerCellClass(selected: boolean, muted = false) {
  if (selected) {
    return "min-h-12 touch-manipulation rounded-xl text-base tabular-hours bg-neon-pink text-on-neon shadow-[0_0_12px_rgba(255,45,138,0.35)]";
  }
  if (muted) {
    return "min-h-12 touch-manipulation rounded-xl text-base tabular-hours text-mortar line-through";
  }
  return "min-h-12 touch-manipulation rounded-xl text-base tabular-hours text-text";
}

export function PickerSheet({
  title,
  ariaLabel,
  header,
  footer,
  onClose,
  children,
}: {
  title?: string;
  ariaLabel: string;
  header?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-night/80"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="relative z-10 w-full max-w-md rounded-t-3xl border border-brick-edge bg-brick px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:p-4"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-brick-edge sm:hidden" />
        {header ?? (
          <p className="text-center font-display text-base uppercase text-text">
            {title}
          </p>
        )}
        {children}
        {footer}
      </div>
    </div>
  );
}
