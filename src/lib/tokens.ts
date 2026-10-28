// Paleta de branding.md. Debe coincidir con :root en globals.css
// (lo comprueba contrast.test.ts).
export const TOKENS = {
  night: "#0b0706",
  brick: "#1c1210",
  "brick-edge": "#3a241c",
  mortar: "#6a4a3a",
  "neon-pink": "#ff2d8a",
  "neon-magenta": "#ff4fb0",
  "neon-cyan": "#3ee0ff",
  "neon-orange": "#ff8a1a",
  "neon-lime": "#c8ff3a",
  text: "#f4f0ea",
  "text-dim": "#c4b4a8",
  "on-neon": "#14080c",
} as const;

export type TokenName = keyof typeof TOKENS;
