"use client";

import { useState } from "react";
import { focusRing } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PickerSheet } from "@/components/ui/PickerSheet";
import { formatDayMonth } from "@/lib/format";

export type WeekOption = {
  id: string;
  isActive: boolean;
  isLatest: boolean;
  firstDate: string | null;
  lastDate: string | null;
};

function weekDates({ firstDate, lastDate }: WeekOption) {
  if (!firstDate) {
    return "Sin días";
  }
  if (!lastDate || lastDate === firstDate) {
    return formatDayMonth(firstDate);
  }
  return `${formatDayMonth(firstDate)} – ${formatDayMonth(lastDate)}`;
}

function weekStatus(option: WeekOption) {
  return option.isLatest ? "Semana actual" : "Semana pasada";
}

/** Selector de semana: las fechas como rótulo y la lista en una hoja. */
export function WeekPicker({
  weeks,
  selected,
  onSelect,
}: {
  weeks: WeekOption[];
  selected: WeekOption;
  onSelect: (week: WeekOption) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Cambiar de semana. ${weekStatus(selected)}: ${weekDates(selected)}`}
        onClick={() => setOpen(true)}
        className={`group flex min-h-16 w-full items-center justify-between gap-3 rounded-panel border border-brick-edge bg-brick px-4 py-2.5 text-left touch-manipulation transition-[border-color,box-shadow] hover:border-neon-cyan/60 hover:shadow-[0_0_22px_rgba(62,224,255,0.14)] ${focusRing}`}
      >
        <span className="min-w-0">
          <span className="block truncate font-display text-2xl leading-tight uppercase tabular-hours text-text">
            {weekDates(selected)}
          </span>
          <span className="block text-sm text-text-dim">{weekStatus(selected)}</span>
        </span>
        <Icon
          name="chevronDown"
          className={`size-6 shrink-0 text-neon-cyan transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <PickerSheet title="Elige semana" ariaLabel="Elegir semana" onClose={() => setOpen(false)}>
          <ul className="divide-y divide-brick-edge/60">
            {weeks.map((week) => {
              const current = week.id === selected.id;
              return (
                <li key={week.id}>
                  <button
                    type="button"
                    aria-current={current ? "true" : undefined}
                    onClick={() => {
                      setOpen(false);
                      onSelect(week);
                    }}
                    className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-cell px-1 text-left touch-manipulation hover:bg-brick-edge/30 ${focusRing}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display text-xl leading-tight uppercase tabular-hours text-text">
                        {weekDates(week)}
                      </span>
                      <span className="block text-sm text-text-dim">{weekStatus(week)}</span>
                    </span>
                    {current ? <Icon name="check" className="size-5 shrink-0 text-neon-lime" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </PickerSheet>
      ) : null}
    </>
  );
}
