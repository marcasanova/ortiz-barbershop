export const CLOCK_STEP_MINUTES = 5;

export const CLOCK_HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export const CLOCK_MINUTES = Array.from(
  { length: 60 / CLOCK_STEP_MINUTES },
  (_, index) => index * CLOCK_STEP_MINUTES,
);

export function formatClock(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function parseClock(value: string): { hours: number; minutes: number } {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return {
    hours: Number.isFinite(hours) ? Math.min(23, Math.max(0, hours)) : 0,
    minutes: Number.isFinite(minutes)
      ? Math.min(59, Math.max(0, minutes))
      : 0,
  };
}

export function snapMinutes(
  minutes: number,
  step = CLOCK_STEP_MINUTES,
): number {
  const snapped = Math.round(minutes / step) * step;
  if (snapped >= 60) {
    return 0;
  }
  return snapped;
}

export function snapClock(
  hours: number,
  minutes: number,
  step = CLOCK_STEP_MINUTES,
): { hours: number; minutes: number } {
  const snapped = Math.round(minutes / step) * step;
  if (snapped >= 60) {
    return { hours: (hours + 1) % 24, minutes: 0 };
  }
  return { hours, minutes: snapped };
}
