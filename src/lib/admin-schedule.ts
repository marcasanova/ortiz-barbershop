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
