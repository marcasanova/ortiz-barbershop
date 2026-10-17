import { listAvailableStarts } from "@/domain/slots";
import { toHhMm } from "./time";

export type BoardWindow = {
  date: string;
  start_time: string;
  end_time: string;
};

export type BoardBooking = {
  id: string;
  slot_date: string;
  service_id: string;
  start_time: string;
  end_time: string;
  client_name: string;
};

export function buildPublicBoard(params: {
  service: { id: string; durationMinutes: number };
  windows: BoardWindow[];
  bookings: BoardBooking[];
}) {
  const dates = [
    ...new Set(params.windows.map((window) => window.date)),
  ].sort();

  return {
    service: {
      id: params.service.id,
      durationMinutes: params.service.durationMinutes,
    },
    days: dates.map((date) => {
      const dayWindows = params.windows.filter((window) => window.date === date);
      const dayBookings = params.bookings.filter(
        (booking) => booking.slot_date === date,
      );
      const busy = dayBookings.map((booking) => ({
        start: toHhMm(booking.start_time),
        end: toHhMm(booking.end_time),
      }));

      const starts = new Set<string>();
      for (const window of dayWindows) {
        for (const start of listAvailableStarts({
          windowStart: toHhMm(window.start_time),
          windowEnd: toHhMm(window.end_time),
          durationMinutes: params.service.durationMinutes,
          busy,
        })) {
          starts.add(start);
        }
      }

      return {
        date,
        windows: dayWindows.map((window) => ({
          startTime: toHhMm(window.start_time),
          endTime: toHhMm(window.end_time),
        })),
        availableStarts: [...starts].sort(),
        bookings: dayBookings.map((booking) => ({
          id: booking.id,
          clientName: booking.client_name,
          serviceId: booking.service_id,
          startTime: toHhMm(booking.start_time),
          endTime: toHhMm(booking.end_time),
        })),
      };
    }),
  };
}
