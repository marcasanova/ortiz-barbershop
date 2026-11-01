import { describe, expect, it } from "vitest";
import {
  parseBookingBody,
  parseMoveDayBody,
  parsePaidBody,
  parseSwapBody,
} from "./admin-bookings";

describe("parseBookingBody", () => {
  const valid = {
    name: "  Jose ",
    serviceId: "corte",
    date: "2026-10-30",
    startTime: "21:15",
  };

  it("acepta una reserva válida y normaliza el nombre (también fuera de franja)", () => {
    expect(parseBookingBody(valid)).toEqual({
      ok: true,
      value: { ...valid, name: "Jose" },
    });
  });

  it.each([
    ["sin cuerpo", null, "INVALID_REQUEST"],
    ["fecha mal formada", { ...valid, date: "30/10/2026" }, "INVALID_REQUEST"],
    ["hora mal formada", { ...valid, startTime: "25:00" }, "INVALID_REQUEST"],
    ["nombre vacío", { ...valid, name: "  " }, "INVALID_NAME"],
    ["nombre que no es texto", { ...valid, name: 4 }, "INVALID_NAME"],
    ["servicio desconocido", { ...valid, serviceId: "tinte" }, "INVALID_SERVICE"],
  ] as const)("rechaza %s", (_label, body, code) => {
    expect(parseBookingBody(body)).toEqual({ ok: false, code });
  });
});

describe("parsePaidBody", () => {
  it("acepta sí y no", () => {
    expect(parsePaidBody({ paid: true })).toEqual({ ok: true, value: { paid: true } });
    expect(parsePaidBody({ paid: false })).toEqual({ ok: true, value: { paid: false } });
  });

  it("rechaza lo que no sea booleano", () => {
    expect(parsePaidBody({ paid: "yes" })).toEqual({ ok: false, code: "INVALID_REQUEST" });
  });
});

describe("parseSwapBody", () => {
  it("lee las dos reservas", () => {
    expect(parseSwapBody({ bookingA: "a", bookingB: "b" })).toEqual({
      ok: true,
      value: { bookingA: "a", bookingB: "b" },
    });
  });

  it("rechaza intercambiar una reserva consigo misma", () => {
    expect(parseSwapBody({ bookingA: "a", bookingB: "a" })).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
    });
  });
});

describe("parseMoveDayBody", () => {
  it("lee origen y destino", () => {
    expect(parseMoveDayBody({ from: "2026-10-30", to: "2026-10-31" })).toEqual({
      ok: true,
      value: { from: "2026-10-30", to: "2026-10-31" },
    });
  });

  it("rechaza fechas inválidas o iguales", () => {
    expect(parseMoveDayBody({ from: "ayer", to: "2026-10-31" })).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
    });
    expect(parseMoveDayBody({ from: "2026-10-31", to: "2026-10-31" })).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
    });
  });
});
