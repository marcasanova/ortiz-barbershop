import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getCancelToken,
  getClientKey,
  getDisplayName,
  removeCancelToken,
  saveCancelToken,
  setDisplayName,
} from "./client-identity";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe("client-identity", () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
    });
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: () => "uuid-test-1" },
      configurable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("crea y reutiliza el mismo clientKey", () => {
    expect(getClientKey()).toBe("uuid-test-1");
    expect(getClientKey()).toBe("uuid-test-1");
  });

  it("guarda el nombre para el modal", () => {
    expect(getDisplayName()).toBe("");
    setDisplayName("Marc");
    expect(getDisplayName()).toBe("Marc");
  });

  it("guarda y borra el token de cancelación por reserva", () => {
    saveCancelToken("b1", "tok-1");
    expect(getCancelToken("b1")).toBe("tok-1");
    removeCancelToken("b1");
    expect(getCancelToken("b1")).toBeUndefined();
  });
});
