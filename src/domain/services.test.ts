import { describe, expect, it } from "vitest";
import { SERVICES, getService } from "./services";

describe("services", () => {
  it("el corte normal dura 30 minutos", () => {
    expect(SERVICES.corte.durationMinutes).toBe(30);
  });

  it("el corte atemporal vintage dura una hora", () => {
    expect(SERVICES.corte_barba.durationMinutes).toBe(60);
    expect(SERVICES.corte_barba.label).toBe("Corte atemporal vintage");
  });

  it("cada servicio tiene un nombre corto para el selector y las celdas", () => {
    expect(SERVICES.corte.shortLabel).toBe("Corte");
    expect(SERVICES.corte_barba.shortLabel).toBe("Vintage");
  });

  it("devuelve el servicio por id", () => {
    expect(getService("corte").id).toBe("corte");
  });

  it("lanza INVALID_SERVICE si el id no existe", () => {
    expect(() => getService("tinte")).toThrow("INVALID_SERVICE");
  });
});
