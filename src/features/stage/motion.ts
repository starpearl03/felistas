// Visitor-selectable motion levels (UI-SPEC §7).

export const MOTION_LEVELS = ["still", "calm", "lively"] as const;

export type Motion = (typeof MOTION_LEVELS)[number];

export type MotionParams = {
  /** Share of glyph cells that change per 45 ms tick */
  rate: number;
  /** Glyph field brightness multiplier */
  dim: number;
  /** Cursor light strength */
  light: number;
  /** Sphere spin multiplier */
  spin: number;
};

export const MOTION: Record<Motion, MotionParams> = {
  still: { rate: 0, dim: 0.8, light: 0.32, spin: 0.4 },
  calm: { rate: 0.02, dim: 0.95, light: 0.45, spin: 1 },
  lively: { rate: 0.045, dim: 1.1, light: 0.58, spin: 1.7 },
};

export const DEFAULT_MOTION: Motion = "lively";

export const MOTION_STORAGE_KEY = "dusk-motion";

export const isMotion = (value: unknown): value is Motion =>
  typeof value === "string" && (MOTION_LEVELS as readonly string[]).includes(value);

/** A saved choice wins; otherwise reduced-motion visitors start on Still and everyone else on Lively. */
export function resolveMotion(stored: string | null, prefersReducedMotion: boolean): Motion {
  if (isMotion(stored)) return stored;
  return prefersReducedMotion ? "still" : DEFAULT_MOTION;
}
