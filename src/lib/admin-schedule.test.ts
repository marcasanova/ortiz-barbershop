import { describe, expect, it } from "vitest";
import { bookingsLost } from "./admin-schedule";

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
