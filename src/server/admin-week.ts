import { toHhMm } from "./time";

export type WindowInput = { startTime: string; endTime: string };

export type DbWindow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
};

export type DbBooking = {
  id: string;
  slot_date: string;
  service_id: string;
  start_time: string;
  end_time: string;
  client_name: string;
};

export function windowsToRpcPayload(windows: WindowInput[]) {
  return windows.map((window) => ({
    start_time: window.startTime,
    end_time: window.endTime,
  }));
}

export function mapAdminWeek(params: {
  week: { id: string; public_token: string | null; is_active: boolean };
  windows: DbWindow[];
  bookings: DbBooking[];
}) {
  const dates = [
    ...new Set([
      ...params.windows.map((w) => w.date),
      ...params.bookings.map((b) => b.slot_date),
    ]),
  ].sort();

  return {
    id: params.week.id,
    isActive: params.week.is_active,
    hasPublicToken: Boolean(params.week.public_token),
    days: dates.map((date) => ({
      date,
      windows: params.windows
        .filter((w) => w.date === date)
        .map((w) => ({
          id: w.id,
          startTime: toHhMm(w.start_time),
          endTime: toHhMm(w.end_time),
        })),
      bookings: params.bookings
        .filter((b) => b.slot_date === date)
        .map((b) => ({
          id: b.id,
          clientName: b.client_name,
          serviceId: b.service_id,
          startTime: toHhMm(b.start_time),
          endTime: toHhMm(b.end_time),
        })),
    })),
  };
}
