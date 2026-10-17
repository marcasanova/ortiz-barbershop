import { describe, expect, it } from "vitest";
import { extractRpcCode, rpcErrorToResponse } from "./rpc";

describe("extractRpcCode", () => {
  it("extrae códigos conocidos del mensaje de Postgres", () => {
    expect(extractRpcCode("SLOT_TAKEN")).toBe("SLOT_TAKEN");
    expect(extractRpcCode('raise exception "NAME_TAKEN_THAT_DAY"')).toBe(
      "NAME_TAKEN_THAT_DAY",
    );
    expect(extractRpcCode("LINK_EXPIRED")).toBe("LINK_EXPIRED");
    expect(extractRpcCode("FORBIDDEN")).toBe("FORBIDDEN");
  });

  it("devuelve null si el mensaje no trae un código conocido", () => {
    expect(extractRpcCode("column reference is ambiguous")).toBeNull();
    expect(extractRpcCode(null)).toBeNull();
  });
});

describe("rpcErrorToResponse", () => {
  async function bodyOf(response: Response) {
    return response.json();
  }

  it.each([
    ["LINK_EXPIRED", 404],
    ["NOT_FOUND", 404],
    ["INVALID_NAME", 400],
    ["INVALID_SERVICE", 400],
    ["SLOT_TAKEN", 409],
    ["NAME_TAKEN_THAT_DAY", 409],
    ["ALREADY_BOOKED_THAT_DAY", 409],
    ["FORBIDDEN", 403],
  ] as const)("mapea %s a %i", async (code, status) => {
    const response = rpcErrorToResponse({ message: code });
    expect(response.status).toBe(status);
    expect(await bodyOf(response)).toEqual({ error: { code } });
  });

  it("devuelve 500 INTERNAL_ERROR si el mensaje no es un código conocido", async () => {
    const response = rpcErrorToResponse({ message: "boom" });
    expect(response.status).toBe(500);
    expect(await bodyOf(response)).toEqual({
      error: { code: "INTERNAL_ERROR" },
    });
  });
});
