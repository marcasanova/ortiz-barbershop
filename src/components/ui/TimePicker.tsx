"use client";

export function TimePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (time: string) => void;
  label: string;
}) {
  return (
    <label className="block min-w-0 text-sm text-text-dim">
      {label}
      <span className="relative mt-1.5 block">
        <input
          type="time"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="time-input relative min-h-12 min-w-0 w-full rounded-xl border border-brick-edge bg-night px-3 pr-9 text-base text-text outline-none focus:border-neon-cyan"
        />
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-neon-cyan"
          aria-hidden
        >
          ▾
        </span>
      </span>
    </label>
  );
}
