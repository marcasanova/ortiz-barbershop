import { listAvailableStarts } from "@/domain/slots";

type Range = { startTime: string; endTime: string };

function inside(booking: Range, windows: Range[]) {
  return windows.some(
    (window) =>
      booking.startTime >= window.startTime && booking.endTime <= window.endTime,
  );
}

/**
 * Reservas que se cancelan al guardar un horario: las que estaban dentro del
 * anterior y no caben en el nuevo. Igual que hace replace_day_windows.
 */
export function bookingsLost<T extends Range>(
  bookings: T[],
  before: Range[],
  after: Range[],
): T[] {
  return bookings.filter(
    (booking) => inside(booking, before) && !inside(booking, after),
  );
}

type ScheduleDay = {
  date: string;
  windows: Range[];
  bookings: (Range & { id: string })[];
};

/**
 * Horas a las que se puede mover a un cliente sin pisar a nadie, dentro del
 * horario. El hueco que deja él mismo cuenta como libre, salvo su hora actual.
 */
export function freeHours(days: ScheduleDay[], bookingId: string, durationMinutes: number) {
  return days.flatMap((day) => {
    const others = day.bookings.filter((booking) => booking.id !== bookingId);
    const current = day.bookings.find((booking) => booking.id === bookingId)?.startTime;
    const busy = others.map((booking) => ({ start: booking.startTime, end: booking.endTime }));
    const starts = new Set(
      day.windows.flatMap((window) =>
        listAvailableStarts({
          windowStart: window.startTime,
          windowEnd: window.endTime,
          durationMinutes,
          busy,
        }),
      ),
    );
    if (current) {
      starts.delete(current);
    }
    return starts.size > 0 ? [{ date: day.date, starts: [...starts].sort() }] : [];
  });
}
