import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { TOKENS } from "./tokens";

const AA = 4.5;

describe("contrastRatio", () => {
  it("blanco sobre negro es 21:1 y un color consigo mismo es 1:1", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
    expect(contrastRatio("#3ee0ff", "#3ee0ff")).toBeCloseTo(1, 5);
  });
});

describe("paleta de branding.md", () => {
  it("los tokens de TypeScript son los mismos que los de globals.css", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    for (const [name, hex] of Object.entries(TOKENS)) {
      expect(css).toContain(`--${name}: ${hex};`);
    }
  });

  // Cada texto que la interfaz pinta sobre cada fondo donde puede aparecer.
  it.each([
    ["text", "night"],
    ["text", "brick"],
    ["text-dim", "night"],
    ["text-dim", "brick"],
    ["neon-pink", "night"],
    ["neon-cyan", "night"],
    ["neon-cyan", "brick"],
    ["neon-lime", "night"],
    ["neon-lime", "brick"],
    ["neon-orange", "night"],
    ["neon-orange", "brick"],
    ["on-neon", "neon-pink"],
    ["on-neon", "neon-magenta"],
    ["on-neon", "neon-lime"],
    ["on-neon", "neon-cyan"],
  ] as const)("%s sobre %s llega a 4.5:1", (fg, bg) => {
    expect(contrastRatio(TOKENS[fg], TOKENS[bg])).toBeGreaterThanOrEqual(AA);
  });

  it("mortar no sirve para texto: solo trazos decorativos", () => {
    expect(contrastRatio(TOKENS.mortar, TOKENS.night)).toBeLessThan(AA);
  });
});
