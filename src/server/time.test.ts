import { describe, expect, it } from "vitest";
import { toHhMm } from "./time";

describe("toHhMm", () => {
  it("recorta segundos de Postgres", () => {
    expect(toHhMm("16:00:00")).toBe("16:00");
    expect(toHhMm("19:30:00")).toBe("19:30");
  });

  it("deja HH:mm como está", () => {
    expect(toHhMm("16:00")).toBe("16:00");
  });
});
