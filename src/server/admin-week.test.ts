import { describe, expect, it } from "vitest";
import { mapAdminWeek, mapWeekList, windowsToRpcPayload } from "./admin-week";

describe("windowsToRpcPayload", () => {
  it("pasa de camelCase a snake_case para la RPC", () => {
    expect(
      windowsToRpcPayload([
        { startTime: "16:00", endTime: "20:00" },
        { startTime: "10:00", endTime: "12:00" },
      ]),
    ).toEqual([
      { start_time: "16:00", end_time: "20:00" },
      { start_time: "10:00", end_time: "12:00" },
    ]);
  });
});

describe("mapAdminWeek", () => {
  it("agrupa ventanas y reservas por día en camelCase", () => {
    const mapped = mapAdminWeek({
      week: {
        id: "week-1",
        public_token: "abc",
        is_active: true,
      },
      windows: [
        {
          id: "w1",
          date: "2026-10-20",
          start_time: "16:00:00",
          end_time: "20:00:00",
        },
      ],
      bookings: [
        {
          id: "b1",
          slot_date: "2026-10-20",
          service_id: "corte",
          start_time: "16:00:00",
          end_time: "16:30:00",
          client_name: "Marc",
          paid_at: "2026-10-20T18:00:00Z",
          created_by_admin: true,
        },
        {
          id: "b2",
          slot_date: "2026-10-20",
          service_id: "corte",
          start_time: "16:30:00",
          end_time: "17:00:00",
          client_name: "Luis",
          paid_at: null,
          created_by_admin: false,
        },
      ],
    });

    expect(mapped).toEqual({
      id: "week-1",
      isActive: true,
      hasPublicToken: true,
      days: [
        {
          date: "2026-10-20",
          windows: [{ id: "w1", startTime: "16:00", endTime: "20:00" }],
          paidCount: 1,
          bookings: [
            {
              id: "b1",
              clientName: "Marc",
              serviceId: "corte",
              startTime: "16:00",
              endTime: "16:30",
              paid: true,
              createdByAdmin: true,
            },
            {
              id: "b2",
              clientName: "Luis",
              serviceId: "corte",
              startTime: "16:30",
              endTime: "17:00",
              paid: false,
              createdByAdmin: false,
            },
          ],
        },
      ],
    });
  });

  it("marca hasPublicToken false si no hay token", () => {
    const mapped = mapAdminWeek({
      week: { id: "week-1", public_token: null, is_active: false },
      windows: [],
      bookings: [],
    });

    expect(mapped.hasPublicToken).toBe(false);
    expect(mapped.days).toEqual([]);
  });
});

describe("mapWeekList", () => {
  it("ordena de la más nueva a la más vieja con su rango de fechas", () => {
    const list = mapWeekList(
      [
        { id: "new", is_active: true, created_at: "2026-11-01T10:00:00Z" },
        { id: "old", is_active: false, created_at: "2026-10-20T10:00:00Z" },
      ],
      [
        { week_id: "old", date: "2026-10-21" },
        { week_id: "old", date: "2026-10-20" },
        { week_id: "new", date: "2026-11-06" },
      ],
    );

    expect(list).toEqual([
      { id: "new", isActive: true, isLatest: true, firstDate: "2026-11-06", lastDate: "2026-11-06" },
      { id: "old", isActive: false, isLatest: false, firstDate: "2026-10-20", lastDate: "2026-10-21" },
    ]);
  });

  it("una semana sin días no tiene fechas", () => {
    const [week] = mapWeekList(
      [{ id: "w", is_active: false, created_at: "2026-11-01T10:00:00Z" }],
      [],
    );
    expect(week).toMatchObject({ firstDate: null, lastDate: null, isLatest: true });
  });
});
