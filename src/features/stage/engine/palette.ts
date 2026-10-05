// Canvas colours. Values come from UI-SPEC §2 (canvas palettes); CSS colours live in globals.css.

export type RGB = readonly [number, number, number];

export const hexToRgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

export const rgba = (c: RGB, alpha: number): string => `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;

export const PALETTE = {
  /** The dim field */
  base: ["#2b1c26", "#45293a", "#1f141b"].map(hexToRgb),
  /** Lit cells: the name and highlights */
  hi: ["#c88ca0", "#f4dce4", "#e2a6b6"].map(hexToRgb),
  /** Cursor glow and the front of the sphere */
  light: hexToRgb("#fbe3ea"),
  accent: hexToRgb("#e2a6b6"),
};

export const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$&*()-_+=/[]{};:<>,".split("");
