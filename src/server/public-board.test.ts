import { describe, expect, it } from "vitest";
import { SERVICES } from "@/domain/services";
import { buildPublicBoard } from "./public-board";

describe("buildPublicBoard", () => {
  it("calcula inicios cada 10 minutos para un corte de 30", () => {
    const board = buildPublicBoard({
      service: SERVICES.corte,
      windows: [
        {
          date: "2026-10-20",
          start_time: "16:00:00",
          end_time: "20:00:00",
        },
      ],
      bookings: [],
    });

    expect(board.days).toHaveLength(1);
    expect(board.days[0].availableStarts[0]).toBe("16:00");
    expect(board.days[0].availableStarts.at(-1)).toBe("19:30");
    expect(board.days[0].availableStarts).not.toContain("19:40");
  });

  it("acota el último inicio a 19:00 para el corte atemporal vintage (1 h)", () => {
    const board = buildPublicBoard({
      service: SERVICES.corte_barba,
      windows: [
        {
          date: "2026-10-20",
          start_time: "16:00",
          end_time: "20:00",
        },
      ],
      bookings: [],
    });

    expect(board.days[0].availableStarts.at(-1)).toBe("19:00");
    expect(board.service.durationMinutes).toBe(60);
  });

  it("omite inicios que pisan una reserva de 16:00–16:30", () => {
    const board = buildPublicBoard({
      service: SERVICES.corte_barba,
      windows: [
        {
          date: "2026-10-20",
          start_time: "16:00",
          end_time: "20:00",
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

    expect(board.days[0].availableStarts[0]).toBe("16:30");
    expect(board.days[0].availableStarts).not.toContain("16:00");
    expect(board.days[0].availableStarts).not.toContain("16:10");
    expect(board.days[0].availableStarts.at(-1)).toBe("19:00");
    expect(board.days[0].bookings[0]).toEqual({
      id: "b1",
      clientName: "Marc",
      serviceId: "corte",
      startTime: "16:00",
      endTime: "16:30",
    });
  });

  it("fusiona inicios de dos ventanas el mismo día", () => {
    const board = buildPublicBoard({
      service: SERVICES.corte,
      windows: [
        {
          date: "2026-10-20",
          start_time: "16:00",
          end_time: "17:00",
        },
        {
          date: "2026-10-20",
          start_time: "19:00",
          end_time: "20:00",
        },
      ],
      bookings: [],
    });

    expect(board.days[0].availableStarts).toContain("16:00");
    expect(board.days[0].availableStarts).toContain("16:30");
    expect(board.days[0].availableStarts).toContain("19:00");
    expect(board.days[0].availableStarts).toContain("19:30");
    expect(board.days[0].availableStarts).not.toContain("17:00");
    expect(board.days[0].windows).toHaveLength(2);
  });
});
