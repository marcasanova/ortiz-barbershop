"use client";

import type { ReactNode } from "react";
import { Sheet } from "./Sheet";

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
  return (
    <Sheet
      ariaLabel={ariaLabel}
      onClose={onClose}
      footer={footer}
      header={
        <div className="px-4 pt-2">
          {header ?? (
            <p className="text-center text-base font-semibold text-text">
              {title}
            </p>
          )}
        </div>
      }
    >
      <div className="-mx-1">{children}</div>
    </Sheet>
  );
}
