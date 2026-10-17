import { describe, expect, it } from "vitest";
import { SERVICES, getService } from "./services";

describe("services", () => {
  it("el corte normal dura 30 minutos", () => {
    expect(SERVICES.corte.durationMinutes).toBe(30);
  });

  it("el corte + barba dura 40 minutos", () => {
    expect(SERVICES.corte_barba.durationMinutes).toBe(40);
  });

  it("devuelve el servicio por id", () => {
    expect(getService("corte").id).toBe("corte");
  });

  it("lanza INVALID_SERVICE si el id no existe", () => {
    expect(() => getService("tinte")).toThrow("INVALID_SERVICE");
  });
});
