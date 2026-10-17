import { describe, expect, it } from "vitest";
import { SERVICES } from "./services";
import { listAvailableStarts } from "./slots";

function everyTenMinutes(from: string, last: string): string[] {
  const [fromH, fromM] = from.split(":").map(Number);
  const [lastH, lastM] = last.split(":").map(Number);
  const start = fromH * 60 + fromM;
  const end = lastH * 60 + lastM;
  const times: string[] = [];

  for (let cursor = start; cursor <= end; cursor += 10) {
    const hours = Math.floor(cursor / 60);
    const minutes = cursor % 60;
    times.push(
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    );
  }

  return times;
}

describe("listAvailableStarts", () => {
  it("ofrece inicios cada 10 minutos para un corte de 30 en 16:00–20:00", () => {
    expect(
      listAvailableStarts({
        windowStart: "16:00",
        windowEnd: "20:00",
        durationMinutes: SERVICES.corte.durationMinutes,
      }),
    ).toEqual(everyTenMinutes("16:00", "19:30"));
  });

  it("corta antes el último inicio si el corte dura 40 minutos", () => {
    expect(
      listAvailableStarts({
        windowStart: "16:00",
        windowEnd: "20:00",
        durationMinutes: SERVICES.corte_barba.durationMinutes,
      }),
    ).toEqual(everyTenMinutes("16:00", "19:20"));
  });

  it("omite inicios que pisan una reserva de 16:00–16:30 en un corte de 40", () => {
    expect(
      listAvailableStarts({
        windowStart: "16:00",
        windowEnd: "20:00",
        durationMinutes: SERVICES.corte_barba.durationMinutes,
        busy: [{ start: "16:00", end: "16:30" }],
      }),
    ).toEqual(everyTenMinutes("16:30", "19:20"));
  });

  it("no ofrece 19:40 para un corte de 30 minutos", () => {
    const starts = listAvailableStarts({
      windowStart: "16:00",
      windowEnd: "20:00",
      durationMinutes: 30,
    });

    expect(starts).not.toContain("19:40");
    expect(starts.at(-1)).toBe("19:30");
  });

  it("devuelve lista vacía si el tramo no cabe un corte", () => {
    expect(
      listAvailableStarts({
        windowStart: "16:00",
        windowEnd: "16:20",
        durationMinutes: 30,
      }),
    ).toEqual([]);
  });

  it("lanza INVALID_DURATION si los minutos no son positivos", () => {
    expect(() =>
      listAvailableStarts({
        windowStart: "16:00",
        windowEnd: "20:00",
        durationMinutes: 0,
      }),
    ).toThrow("INVALID_DURATION");
  });

  it("lanza INVALID_RANGE si el fin no es posterior al inicio", () => {
    expect(() =>
      listAvailableStarts({
        windowStart: "20:00",
        windowEnd: "16:00",
        durationMinutes: 30,
      }),
    ).toThrow("INVALID_RANGE");
  });
});
