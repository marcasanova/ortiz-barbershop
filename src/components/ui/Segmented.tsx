"use client";

import { useRef } from "react";
import { focusRing } from "./Button";
import { Icon, type IconName } from "./Icon";

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { value: T; label: string; hint?: string; icon?: IconName }[];
  onChange: (value: T) => void;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function move(index: number, delta: number) {
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid rounded-2xl border border-brick-edge bg-night p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (value === null && index === 0) ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold touch-manipulation transition-colors ${focusRing} ${
              selected
                ? "bg-neon-pink text-on-neon shadow-[0_0_14px_rgba(255,45,138,0.35)]"
                : "text-text-dim hover:text-text"
            }`}
          >
            {option.icon ? (
              <Icon name={option.icon} className="size-5 shrink-0" />
            ) : null}
            {option.label}
            {option.hint ? (
              <span className="font-normal opacity-80">{option.hint}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
