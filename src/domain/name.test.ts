import { describe, expect, it } from "vitest";
import { normalizeName, normalizeNameKey } from "./name";

describe("normalizeName", () => {
  it("recorta los espacios del inicio y del final", () => {
    expect(normalizeName("  Marc  ")).toBe("Marc");
  });

  it("deja un nombre sin espacios extra como está", () => {
    expect(normalizeName("Marc")).toBe("Marc");
  });

  it("acepta un nombre de exactamente 40 caracteres", () => {
    const name = "a".repeat(40);
    expect(normalizeName(name)).toBe(name);
  });

  it("lanza INVALID_NAME si está vacío", () => {
    expect(() => normalizeName("")).toThrow("INVALID_NAME");
  });

  it("lanza INVALID_NAME si solo hay espacios", () => {
    expect(() => normalizeName("   ")).toThrow("INVALID_NAME");
  });

  it("lanza INVALID_NAME si tiene más de 40 caracteres", () => {
    expect(() => normalizeName("a".repeat(41))).toThrow("INVALID_NAME");
  });
});

describe("normalizeNameKey", () => {
  it("devuelve el nombre en minúsculas y recortado", () => {
    expect(normalizeNameKey("  Marc  ")).toBe("marc");
  });

  it("trata Marc y marc como la misma clave", () => {
    expect(normalizeNameKey("Marc")).toBe(normalizeNameKey("marc"));
  });

  it("trata MARC con espacios igual que marc", () => {
    expect(normalizeNameKey("  MARC  ")).toBe(normalizeNameKey("marc"));
  });
});
