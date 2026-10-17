"use client";

import { useMemo, useState } from "react";
import {
  CALENDAR_WEEKDAYS,
  buildMonthCells,
  monthLabel,
  parseIsoDate,
  shiftMonth,
  todayIso,
} from "@/lib/calendar";
import { formatDay } from "@/lib/format";
import {
  PickerSheet,
  pickerCellClass,
  pickerFooterAccentClass,
  pickerFooterGhostClass,
  pickerNavClass,
  pickerTriggerClass,
} from "./PickerSheet";

export function DatePicker({
  value,
  onChange,
  disabledDates = [],
  label = "Día",
}: {
  value: string;
  onChange: (iso: string) => void;
  disabledDates?: string[];
  label?: string;
}) {
  const today = todayIso();
  const initial = value ? parseIsoDate(value) : parseIsoDate(today);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState({
    year: initial.year,
    month: initial.month,
  });

  const cells = useMemo(
    () => buildMonthCells(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  const disabled = useMemo(() => new Set(disabledDates), [disabledDates]);

  function openSheet() {
    const source = value || today;
    const parsed = parseIsoDate(source);
    setCursor({ year: parsed.year, month: parsed.month });
    setOpen(true);
  }

  function pick(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  function jumpToday() {
    const parsed = parseIsoDate(today);
    setCursor({ year: parsed.year, month: parsed.month });
    if (!disabled.has(today)) {
      pick(today);
    }
  }

  return (
    <div className="w-full">
      <p className="mb-1.5 text-sm text-text-dim">{label}</p>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openSheet}
        className={pickerTriggerClass}
      >
        <span className={value ? "first-letter:uppercase" : "text-mortar"}>
          {value ? formatDay(value) : "Toca para elegir el día"}
        </span>
        <span className="text-lg text-neon-cyan" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <PickerSheet
          ariaLabel="Elegir día"
          onClose={() => setOpen(false)}
          header={
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className={pickerNavClass}
                aria-label="Mes anterior"
                onClick={() =>
                  setCursor(shiftMonth(cursor.year, cursor.month, -1))
                }
              >
                ‹
              </button>
              <p className="font-display text-base uppercase text-text">
                {monthLabel(cursor.year, cursor.month)}
              </p>
              <button
                type="button"
                className={pickerNavClass}
                aria-label="Mes siguiente"
                onClick={() =>
                  setCursor(shiftMonth(cursor.year, cursor.month, 1))
                }
              >
                ›
              </button>
            </div>
          }
          footer={
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={pickerFooterAccentClass}
                onClick={jumpToday}
                disabled={disabled.has(today)}
              >
                Hoy
              </button>
              <button
                type="button"
                className={pickerFooterGhostClass}
                onClick={() => setOpen(false)}
              >
                Cerrar
              </button>
            </div>
          }
        >
          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {CALENDAR_WEEKDAYS.map((day) => (
              <span key={day} className="py-1 text-xs text-mortar">
                {day}
              </span>
            ))}
            {cells.map((iso, index) => {
              if (!iso) {
                return <span key={`e-${index}`} className="min-h-12" />;
              }
              const taken = disabled.has(iso);
              const selected = iso === value;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={taken}
                  onClick={() => pick(iso)}
                  className={`${pickerCellClass(selected, taken)} ${
                    !selected && !taken && isToday
                      ? "border border-neon-cyan text-neon-cyan"
                      : ""
                  }`}
                >
                  {Number(iso.slice(8))}
                </button>
              );
            })}
          </div>
        </PickerSheet>
      ) : null}
    </div>
  );
}
