import { describe, expect, it } from "vitest";
import {
  CLOCK_HOURS,
  CLOCK_MINUTES,
  formatClock,
  parseClock,
  snapClock,
  snapMinutes,
} from "./clock";

describe("clock", () => {
  it("formatea con ceros", () => {
    expect(formatClock(9, 0)).toBe("09:00");
    expect(formatClock(16, 5)).toBe("16:05");
  });

  it("lee HH:MM y recorta fuera de rango", () => {
    expect(parseClock("16:40")).toEqual({ hours: 16, minutes: 40 });
    expect(parseClock("99:99")).toEqual({ hours: 23, minutes: 59 });
  });

  it("redondea minutos al paso de 5", () => {
    expect(snapMinutes(2)).toBe(0);
    expect(snapMinutes(3)).toBe(5);
    expect(snapMinutes(58)).toBe(0);
  });

  it("al redondear 58 sube de hora", () => {
    expect(snapClock(16, 58)).toEqual({ hours: 17, minutes: 0 });
    expect(snapClock(23, 58)).toEqual({ hours: 0, minutes: 0 });
  });

  it("listas de rueda", () => {
    expect(CLOCK_HOURS).toHaveLength(24);
    expect(CLOCK_MINUTES).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  });
});
