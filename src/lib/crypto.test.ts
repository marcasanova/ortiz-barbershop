import { describe, expect, it } from "vitest";
import { hashSecret } from "./crypto";

describe("hashSecret", () => {
  it("devuelve el mismo hash si el secreto es el mismo", () => {
    expect(hashSecret("token-1")).toBe(hashSecret("token-1"));
  });

  it("devuelve hashes distintos si los secretos son distintos", () => {
    expect(hashSecret("a")).not.toBe(hashSecret("b"));
  });

  it("no devuelve el secreto en claro", () => {
    expect(hashSecret("token-1")).not.toBe("token-1");
  });

  it("devuelve un SHA-256 en hexadecimal de 64 caracteres", () => {
    expect(hashSecret("token-1")).toMatch(/^[a-f0-9]{64}$/);
  });
});
