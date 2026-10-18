import { describe, expect, it } from "vitest";
import { buildDaySlots, type PublicBooking } from "./day-slots";

function booking(id: string, startTime: string, endTime: string): PublicBooking {
  return { id, clientName: id, serviceId: "corte", startTime, endTime };
}

const summary = (slots: ReturnType<typeof buildDaySlots>) =>
  slots.map((slot) =>
    slot.kind === "free" ? slot.start : `${slot.start} ${slot.booking.clientName}`,
  );

describe("buildDaySlots", () => {
  it("sin reservas devuelve solo libres", () => {
    expect(summary(buildDaySlots(["16:00", "16:10"], []))).toEqual([
      "16:00",
      "16:10",
    ]);
  });

  it("intercala reservas por hora", () => {
    const slots = buildDaySlots(
      ["16:00", "17:00", "17:10"],
      [booking("Juan", "16:30", "17:00")],
    );
    expect(summary(slots)).toEqual(["16:00", "16:30 Juan", "17:00", "17:10"]);
  });

  it("un día completo devuelve solo reservas", () => {
    const slots = buildDaySlots(
      [],
      [booking("Ana", "17:00", "17:30"), booking("Luis", "16:00", "16:40")],
    );
    expect(summary(slots)).toEqual(["16:00 Luis", "17:00 Ana"]);
  });

  it("mantiene el orden con reservas seguidas", () => {
    const slots = buildDaySlots(
      ["18:00"],
      [
        booking("Pablo", "17:30", "18:00"),
        booking("Marc", "16:30", "17:00"),
        booking("Juan", "17:00", "17:30"),
      ],
    );
    expect(summary(slots)).toEqual([
      "16:30 Marc",
      "17:00 Juan",
      "17:30 Pablo",
      "18:00",
    ]);
  });

  it("con la misma hora la reserva va primero", () => {
    const slots = buildDaySlots(["16:00"], [booking("Juan", "16:00", "16:30")]);
    expect(summary(slots)).toEqual(["16:00 Juan", "16:00"]);
  });
});
