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
  paid_at: string | null;
  created_by_admin: boolean;
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
    days: dates.map((date) => {
      const dayBookings = params.bookings.filter((b) => b.slot_date === date);
      return {
        date,
        windows: params.windows
          .filter((w) => w.date === date)
          .map((w) => ({
            id: w.id,
            startTime: toHhMm(w.start_time),
            endTime: toHhMm(w.end_time),
          })),
        paidCount: dayBookings.filter((b) => b.paid_at).length,
        bookings: dayBookings.map((b) => ({
          id: b.id,
          clientName: b.client_name,
          serviceId: b.service_id,
          startTime: toHhMm(b.start_time),
          endTime: toHhMm(b.end_time),
          paid: Boolean(b.paid_at),
          createdByAdmin: b.created_by_admin,
        })),
      };
    }),
  };
}

export type WeekListRow = { id: string; is_active: boolean; created_at: string };

/** Semanas para el selector de Raúl, de la más nueva a la más vieja. */
export function mapWeekList(
  weeks: WeekListRow[],
  windows: { week_id: string; date: string }[],
) {
  const sorted = [...weeks].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return sorted.map((week, index) => {
    const dates = windows
      .filter((window) => window.week_id === week.id)
      .map((window) => window.date)
      .sort();

    return {
      id: week.id,
      isActive: week.is_active,
      isLatest: index === 0,
      firstDate: dates[0] ?? null,
      lastDate: dates.at(-1) ?? null,
    };
  });
}
