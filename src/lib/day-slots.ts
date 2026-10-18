export type PublicBooking = {
  id: string;
  clientName: string;
  serviceId: string;
  startTime: string;
  endTime: string;
};

export type DaySlot =
  | { kind: "free"; start: string }
  | { kind: "booked"; start: string; booking: PublicBooking };

/** Libres y reservas en una sola lista ordenada por hora (`HH:MM`). */
export function buildDaySlots(
  availableStarts: string[],
  bookings: PublicBooking[],
): DaySlot[] {
  const slots: DaySlot[] = [
    ...bookings.map((booking) => ({
      kind: "booked" as const,
      start: booking.startTime,
      booking,
    })),
    ...availableStarts.map((start) => ({ kind: "free" as const, start })),
  ];

  // sort es estable: con la misma hora, la reserva (añadida antes) va primero.
  return slots.sort((a, b) => a.start.localeCompare(b.start));
}
