import { describe, expect, it } from "vitest";
import { durationText, formatDayNumber, serviceLabel, serviceName } from "./format";

describe("serviceName", () => {
  it("da el nombre completo del servicio", () => {
    expect(serviceName("corte")).toBe("Corte");
    expect(serviceName("corte_barba")).toBe("Corte atemporal vintage");
  });

  it("da el nombre corto para sitios estrechos", () => {
    expect(serviceName("corte_barba", "short")).toBe("Vintage");
  });

  it("devuelve el id tal cual si no lo conoce", () => {
    expect(serviceName("tinte")).toBe("tinte");
  });
});

describe("serviceLabel", () => {
  it("añade la duración", () => {
    expect(serviceLabel("corte_barba")).toBe("Corte atemporal vintage (60 min)");
  });
});

describe("formatDayNumber", () => {
  it("devuelve el día del mes sin cero delante", () => {
    expect(formatDayNumber("2026-10-30")).toBe("30");
    expect(formatDayNumber("2026-11-03")).toBe("3");
  });
});

describe("durationText", () => {
  it("dice la duración como se diría en voz alta", () => {
    expect(durationText(30)).toBe("30 minutos");
    expect(durationText(60)).toBe("1 hora");
    expect(durationText(90)).toBe("1 hora y 30 minutos");
    expect(durationText(120)).toBe("2 horas");
  });
});
