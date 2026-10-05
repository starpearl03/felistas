export const clamp = (v: number, min = 0, max = 1): number => Math.max(min, Math.min(max, v));

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

/** Smoothstep easing on [0, 1]. */
export const smoothstep = (k: number): number => k * k * (3 - 2 * k);

export function pick<T>(items: readonly T[], rand: () => number = Math.random): T {
  return items[Math.floor(rand() * items.length)];
}
