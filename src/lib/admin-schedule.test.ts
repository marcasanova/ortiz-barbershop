import { describe, expect, it } from "vitest";
import { bookingsLost, freeHours } from "./admin-schedule";

const at = (startTime: string, endTime: string) => ({ startTime, endTime });

describe("bookingsLost", () => {
  const before = [at("16:00", "20:00")];

  it("no cuenta las que siguen dentro del horario nuevo", () => {
    expect(bookingsLost([at("16:00", "16:30")], before, [at("15:00", "19:00")])).toEqual([]);
  });

  it("cuenta las que estaban dentro y se quedan fuera", () => {
    const booking = at("19:00", "19:30");
    expect(bookingsLost([booking], before, [at("16:00", "18:00")])).toEqual([booking]);
  });

  it("no cuenta las que Raúl puso fuera del horario: esas se mantienen", () => {
    expect(bookingsLost([at("21:00", "21:30")], before, [at("16:00", "18:00")])).toEqual([]);
  });
});

describe("freeHours", () => {
  const booked = (id: string, startTime: string, endTime: string) => ({ id, startTime, endTime });
  const friday = {
    date: "2026-11-06",
    windows: [at("16:00", "17:00")],
    bookings: [booked("a", "16:00", "16:30"), booked("b", "16:30", "17:00")],
  };

  it("no ofrece nada si el día está lleno", () => {
    expect(freeHours([friday], "z", 30)).toEqual([]);
  });

  it("cuenta como libre el hueco que deja el propio cliente, menos su hora actual", () => {
    const day = { ...friday, bookings: [booked("a", "16:00", "16:30")] };
    expect(freeHours([day], "a", 30)).toEqual([
      { date: day.date, starts: ["16:10", "16:20", "16:30"] },
    ]);
  });

  it("solo ofrece horas donde cabe el corte entero", () => {
    const day = { ...friday, bookings: [booked("a", "16:00", "16:30")] };
    expect(freeHours([day], "z", 60)).toEqual([]);
  });

  it("incluye los demás días abiertos", () => {
    const saturday = { date: "2026-11-07", windows: [at("10:00", "10:30")], bookings: [] };
    expect(freeHours([friday, saturday], "a", 30)).toEqual([
      { date: saturday.date, starts: ["10:00"] },
    ]);
  });
});
