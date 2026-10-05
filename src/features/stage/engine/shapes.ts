// The sphere's forms and the "dispatch and combine" burst (UI-SPEC §5). Pure, so it is unit-tested.

export const SHAPE_NAMES = ["sphere", "torus", "cube", "helix", "ring"] as const;

export type ShapeName = (typeof SHAPE_NAMES)[number];

export type Vec3 = readonly [number, number, number];

type ShapeFn = (i: number, n: number) => Vec3;

const TAU = Math.PI * 2;

export const SHAPES: Record<ShapeName, ShapeFn> = {
  // Fibonacci sphere
  sphere: (i, n) => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  },
  torus: (i, n) => {
    const ring = 24;
    const u = ((i % ring) / ring) * TAU;
    const v = (Math.floor(i / ring) / Math.ceil(n / ring)) * TAU;
    const R = 0.66;
    const r = 0.3;
    return [
      (R + r * Math.cos(u)) * Math.cos(v),
      r * Math.sin(u),
      (R + r * Math.cos(u)) * Math.sin(v),
    ];
  },
  // Points spread over the six faces
  cube: (i, n) => {
    const face = i % 6;
    const j = Math.floor(i / 6);
    const m = Math.max(2, Math.ceil(Math.sqrt(n / 6)));
    const u = ((j % m) / (m - 1)) * 2 - 1;
    const v = (Math.floor(j / m) / (m - 1)) * 2 - 1;
    const s = 0.62;
    const faces: Vec3[] = [
      [s, u * s, v * s],
      [-s, u * s, v * s],
      [u * s, s, v * s],
      [u * s, -s, v * s],
      [u * s, v * s, s],
      [u * s, v * s, -s],
    ];
    return faces[face];
  },
  // Two strands
  helix: (i, n) => {
    const strand = i % 2;
    const k = Math.floor(i / 2) / (n / 2);
    const a = k * Math.PI * 5 + strand * Math.PI;
    return [Math.cos(a) * 0.5, k * 1.9 - 0.95, Math.sin(a) * 0.5];
  },
  // Three flat rings
  ring: (i, n) => {
    const band = i % 3;
    const a = (i / n) * TAU * 3 + band;
    const r = 0.55 + band * 0.18;
    return [Math.cos(a) * r, (band - 1) * 0.06, Math.sin(a) * r];
  },
};

export const BURST_DECAY = 0.972;

/** One frame of burst decay; snaps to 0 once negligible. */
export function stepBurst(burst: number): number {
  const next = burst * BURST_DECAY;
  return next < 0.003 ? 0 : next;
}

/** How far points are pushed out: 0 at the start and end of a burst, 1 halfway through. */
export function burstSpread(burst: number): number {
  return burst > 0 ? Math.sin(Math.PI * (1 - burst)) : 0;
}
