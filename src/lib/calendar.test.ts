import { describe, expect, it } from "vitest";
import { buildMonthCells, shiftMonth, toIsoDate, todayIso } from "./calendar";

describe("calendar", () => {
  it("formatea ISO con ceros", () => {
    expect(toIsoDate(2026, 10, 5)).toBe("2026-10-05");
  });

  it("octubre 2026 empieza en jueves (3 huecos lun-mié)", () => {
    const cells = buildMonthCells(2026, 10);
    expect(cells.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(cells).toContain("2026-10-31");
    expect(cells.length % 7).toBe(0);
  });

  it("cambia de mes y de año", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("hoy en ISO local", () => {
    expect(todayIso(new Date(2026, 9, 17))).toBe("2026-10-17");
  });
});
