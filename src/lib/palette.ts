// The Dusk palette for places CSS variables can't reach: generated images (Open Graph, icons) and
// the theme-color meta. Mirrors the tokens at the top of src/app/globals.css; change both together.
export const PALETTE = {
  bg: "#110b10",
  fg: "#f1e7ec",
  fg2: "#cdb9c3",
  muted: "#9a8490",
  acc: "#e2a6b6",
  acc2: "#fbe3ea",
  /** Email only: a light page reads reliably in every mail client */
  ink: "#24101a",
  paper: "#fbf7f9",
  rule: "#ead9e1",
  quiet: "#7a6470",
} as const;

const GLYPHS = "01{}<>/=+*#%&$@;:";

export type SphereGlyph = { x: number; y: number; z: number; char: string };

/**
 * A still of Dusk's glyph sphere: points spread evenly over a sphere (a Fibonacci lattice), turned a
 * little so it reads as round, projected to x/y in [-1, 1]; z in [-1, 1] is depth (1 is nearest).
 */
export function sphereStill(count: number, tilt = 0.45, turn = 0.6): SphereGlyph[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y0 = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y0 * y0);
    const a = i * golden + turn;
    const x0 = Math.cos(a) * r;
    const z0 = Math.sin(a) * r;
    // tilt around the x axis
    const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
    const z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
    return { x: x0, y, z, char: GLYPHS[(i * i * 31 + i * 7) % GLYPHS.length] };
  });
}
