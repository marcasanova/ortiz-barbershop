import { describe, expect, it } from "vitest";
import { mapAdminWeek, windowsToRpcPayload } from "./admin-week";

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
          bookings: [
            {
              id: "b1",
              clientName: "Marc",
              serviceId: "corte",
              startTime: "16:00",
              endTime: "16:30",
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
