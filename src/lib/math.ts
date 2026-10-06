export const clamp = (v: number, min = 0, max = 1): number => Math.max(min, Math.min(max, v));

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

/** Smoothstep easing on [0, 1]. */
export const smoothstep = (k: number): number => k * k * (3 - 2 * k);

/** Like smoothstep with gentler ends: it leaves and arrives with no jolt in speed. */
export const smootherstep = (k: number): number => k * k * k * (k * (6 * k - 15) + 10);

export function pick<T>(items: readonly T[], rand: () => number = Math.random): T {
  return items[Math.floor(rand() * items.length)];
}
