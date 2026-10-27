import { describe, expect, it } from "vitest";
import { serviceLabel, serviceName } from "./format";

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
