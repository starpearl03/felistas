// The path from the sphere to the current section's eyebrow, and how the streams on it fade
// (UI-SPEC §5.2). The glyph streams that travel it are in ./streams.
import { lerp } from "@/lib/math";

export type Point = { x: number; y: number };

/** A point on the thread's cubic Bézier: it leaves the sphere level and arrives level at the eyebrow. */
export function threadPoint(from: Point, to: Point, u: number): Point {
  const mx = (from.x + to.x) / 2;
  const iu = 1 - u;
  const a = iu * iu * iu;
  const b = 3 * iu * iu * u;
  const c = 3 * iu * u * u;
  const d = u * u * u;
  return {
    x: a * from.x + b * mx + c * mx + d * to.x,
    y: a * from.y + b * from.y + c * to.y + d * to.y,
  };
}

/** Eases the thread's opacity toward 1 while it should show, and back to 0 otherwise. */
export function nextThreadAlpha(alpha: number, visible: boolean): number {
  return visible ? lerp(alpha, 1, 0.08) : lerp(alpha, 0, 0.1);
}
