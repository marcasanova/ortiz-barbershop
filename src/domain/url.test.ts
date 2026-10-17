import { describe, expect, it } from "vitest";
import { buildPublicUrl } from "./url";

describe("buildPublicUrl", () => {
  it("monta el enlace público con origin y token", () => {
    expect(buildPublicUrl("https://ortiz.test", "abc")).toBe(
      "https://ortiz.test/s/abc",
    );
  });

  it("no duplica la barra si el origin ya termina en /", () => {
    expect(buildPublicUrl("https://ortiz.test/", "abc")).toBe(
      "https://ortiz.test/s/abc",
    );
  });
});
