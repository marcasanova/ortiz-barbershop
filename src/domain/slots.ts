export type TimeInterval = { start: string; end: string };

const DEFAULT_STEP_MINUTES = 10;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function overlaps(
  start: number,
  end: number,
  busy: { start: number; end: number },
): boolean {
  return start < busy.end && end > busy.start;
}

export function listAvailableStarts(params: {
  windowStart: string;
  windowEnd: string;
  durationMinutes: number;
  busy?: TimeInterval[];
  stepMinutes?: number;
}): string[] {
  const stepMinutes = params.stepMinutes ?? DEFAULT_STEP_MINUTES;

  if (!Number.isInteger(params.durationMinutes) || params.durationMinutes <= 0) {
    throw new Error("INVALID_DURATION");
  }

  if (!Number.isInteger(stepMinutes) || stepMinutes <= 0) {
    throw new Error("INVALID_DURATION");
  }

  const windowStart = timeToMinutes(params.windowStart);
  const windowEnd = timeToMinutes(params.windowEnd);

  if (windowEnd <= windowStart) {
    throw new Error("INVALID_RANGE");
  }

  const busy = (params.busy ?? []).map((interval) => ({
    start: timeToMinutes(interval.start),
    end: timeToMinutes(interval.end),
  }));

  const starts: string[] = [];

  for (
    let cursor = windowStart;
    cursor + params.durationMinutes <= windowEnd;
    cursor += stepMinutes
  ) {
    const end = cursor + params.durationMinutes;
    const taken = busy.some((interval) => overlaps(cursor, end, interval));
    if (!taken) {
      starts.push(minutesToTime(cursor));
    }
  }

  return starts;
}
