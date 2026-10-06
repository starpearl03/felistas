// A click on the background sends a shockwave through the glyph field: a ring that lights the glyphs
// it crosses, scrambles them and pushes them outward, then fades. Pure maths, so it is unit-tested.

export const RIPPLE_MS = 1100;
/** How fast the ring grows, in px per ms */
export const RIPPLE_SPEED = 0.85;
/** Half-thickness of the ring, in px */
export const RIPPLE_WIDTH = 34;
/** Furthest a glyph is pushed, in px */
export const RIPPLE_PUSH = 14;
/** At most this many waves at once; a new click replaces the oldest */
export const MAX_RIPPLES = 4;

export type Ripple = { x: number; y: number; t0: number; strength: number };

/**
 * How strongly a wave acts on a glyph `dist` px from its centre, `age` ms after the click:
 * 0 off the ring, up to `strength` on it, fading as the wave ages.
 */
export function rippleBand(dist: number, age: number, strength = 1): number {
  if (age < 0 || age >= RIPPLE_MS) return 0;
  const off = (dist - age * RIPPLE_SPEED) / RIPPLE_WIDTH;
  if (off <= -2.5 || off >= 2.5) return 0;
  const life = 1 - age / RIPPLE_MS;
  return Math.exp(-off * off) * life * life * strength;
}

/** Drops finished waves and keeps at most MAX_RIPPLES, newest last. */
export function liveRipples(ripples: readonly Ripple[], now: number): Ripple[] {
  return ripples.filter((r) => now - r.t0 < RIPPLE_MS).slice(-MAX_RIPPLES);
}

/**
 * Things a click is meant for: controls and text. Anywhere else is background, including the empty
 * parts of the companion, which covers the whole screen in the phone chat.
 */
const NOT_BACKGROUND =
  "a, button, input, textarea, select, label, summary, form, [role='button'], [role='link'], [contenteditable], p, h1, h2, h3, h4, li, dt, dd, blockquote, img, svg";

export function isBackgroundTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !target.closest(NOT_BACKGROUND);
}
