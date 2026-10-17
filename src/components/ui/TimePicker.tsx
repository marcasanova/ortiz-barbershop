"use client";

import { useEffect, useRef, useState } from "react";
import {
  CLOCK_HOURS,
  CLOCK_MINUTES,
  formatClock,
  parseClock,
  snapClock,
} from "@/lib/clock";
import {
  PickerSheet,
  pickerFooterAccentClass,
  pickerFooterGhostClass,
  pickerTriggerClass,
} from "./PickerSheet";

const ITEM = 48;
const PAD = ITEM * 2;

export function TimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (time: string) => void;
  label: string;
}) {
  const parsed = parseClock(value);
  const snapped = snapClock(parsed.hours, parsed.minutes);
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(snapped.hours);
  const [minutes, setMinutes] = useState(snapped.minutes);

  function openSheet() {
    const next = snapClock(parseClock(value).hours, parseClock(value).minutes);
    setHours(next.hours);
    setMinutes(next.minutes);
    setOpen(true);
  }

  function confirm() {
    onChange(formatClock(hours, minutes));
    setOpen(false);
  }

  const display = formatClock(hours, minutes);

  return (
    <div className="w-full min-w-0">
      <p className="mb-1.5 text-sm text-text-dim">{label}</p>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openSheet}
        className={pickerTriggerClass}
      >
        <span className="tabular-hours">{value || "—"}</span>
        <span className="text-lg text-neon-cyan" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <PickerSheet
          ariaLabel={`Elegir ${label.toLowerCase()}`}
          onClose={() => setOpen(false)}
          header={
            <p className="py-1 text-center font-display text-2xl uppercase tabular-hours text-text">
              {display}
            </p>
          }
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={pickerFooterAccentClass}
                onClick={confirm}
              >
                Listo
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
          <div className="grid grid-cols-2 gap-2 text-center text-xs text-mortar">
            <span>Hora</span>
            <span>Minutos</span>
          </div>
          <div className="relative mt-1 grid grid-cols-2">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-12 -translate-y-1/2 rounded-xl bg-neon-pink/15 ring-1 ring-neon-pink/40"
            />
            <WheelColumn
              ariaLabel="Hora"
              values={CLOCK_HOURS}
              value={hours}
              onChange={setHours}
            />
            <WheelColumn
              ariaLabel="Minutos"
              values={CLOCK_MINUTES}
              value={minutes}
              onChange={setMinutes}
            />
          </div>
        </PickerSheet>
      ) : null}
    </div>
  );
}

function WheelColumn({
  values,
  value,
  onChange,
  ariaLabel,
}: {
  values: readonly number[];
  value: number;
  onChange: (next: number) => void;
  ariaLabel: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) {
      return;
    }
    const index = Math.max(0, values.indexOf(value));
    el.scrollTop = index * ITEM;
    // Solo al montar la hoja, para no pelear con el dedo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    const el = scroller.current;
    if (!el) {
      return;
    }
    const index = Math.round(el.scrollTop / ITEM);
    const next = values[Math.max(0, Math.min(values.length - 1, index))];
    if (next !== undefined && next !== value) {
      onChange(next);
    }
  }

  return (
    <div
      className="relative h-60 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]"
    >
      <div
        ref={scroller}
        role="listbox"
        aria-label={ariaLabel}
        onScroll={handleScroll}
        className="h-60 snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingTop: PAD, paddingBottom: PAD }}
      >
        {values.map((item) => (
          <button
            key={item}
            type="button"
            role="option"
            aria-selected={item === value}
            onClick={() => {
              const index = values.indexOf(item);
              scroller.current?.scrollTo({
                top: index * ITEM,
                behavior: "smooth",
              });
              onChange(item);
            }}
            className={`flex h-12 w-full snap-center items-center justify-center text-xl tabular-hours ${
              item === value
                ? "font-semibold text-neon-pink"
                : "text-mortar"
            }`}
          >
            {String(item).padStart(2, "0")}
          </button>
        ))}
      </div>
    </div>
  );
}
