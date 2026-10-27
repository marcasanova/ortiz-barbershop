import { describe, expect, it } from "vitest";
import { SERVICES } from "./services";
import { fitsAt, listAvailableStarts } from "./slots";

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

describe("fitsAt", () => {
  const windows = [{ start: "16:00", end: "20:00" }];

  it("cabe en una franja libre", () => {
    expect(fitsAt({ windows, start: "16:30", durationMinutes: 30 })).toBe(true);
  });

  it("no cabe si se sale de la franja", () => {
    expect(fitsAt({ windows, start: "19:40", durationMinutes: 30 })).toBe(false);
    expect(fitsAt({ windows, start: "15:50", durationMinutes: 30 })).toBe(false);
  });

  it("no cabe si pisa otra reserva", () => {
    expect(
      fitsAt({
        windows,
        start: "16:10",
        durationMinutes: 30,
        busy: [{ start: "16:30", end: "17:00" }],
      }),
    ).toBe(false);
  });

  it("un corte + barba (40) no cabe en un hueco de 30 entre dos reservas", () => {
    const busy = [
      { start: "16:00", end: "16:30" },
      { start: "16:30", end: "17:00" },
      { start: "17:00", end: "17:30" },
    ];
    expect(
      fitsAt({ windows, start: "16:30", durationMinutes: 40, busy, excludeIds: [] }),
    ).toBe(false);
  });

  it("ignora las reservas excluidas (la del dueño al pedirle su hora)", () => {
    const busy = [
      { id: "owner", start: "16:30", end: "17:00" },
      { id: "other", start: "17:00", end: "17:30" },
    ];
    expect(
      fitsAt({ windows, start: "16:30", durationMinutes: 30, busy, excludeIds: ["owner"] }),
    ).toBe(true);
    expect(
      fitsAt({ windows, start: "16:30", durationMinutes: 40, busy, excludeIds: ["owner"] }),
    ).toBe(false);
  });

  it("vale con cualquiera de varias franjas del día", () => {
    const split = [
      { start: "16:00", end: "18:00" },
      { start: "19:00", end: "20:00" },
    ];
    expect(fitsAt({ windows: split, start: "19:20", durationMinutes: 40 })).toBe(true);
    expect(fitsAt({ windows: split, start: "17:40", durationMinutes: 30 })).toBe(false);
  });

  it("coincide con listAvailableStarts en un día libre", () => {
    const starts = listAvailableStarts({
      windowStart: "16:00",
      windowEnd: "20:00",
      durationMinutes: 40,
    });
    for (const start of everyTenMinutes("16:00", "19:50")) {
      expect(fitsAt({ windows, start, durationMinutes: 40 })).toBe(starts.includes(start));
    }
  });
});
