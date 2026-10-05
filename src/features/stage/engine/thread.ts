// The thread from the sphere to the current section's eyebrow (UI-SPEC §5.2).
import { lerp } from "@/lib/math";
import type { Circle } from "./geometry";
import { GLYPHS, PALETTE, rgba } from "./palette";

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

export function drawThread(
  ctx: CanvasRenderingContext2D,
  t: number,
  geo: Circle,
  target: Point,
  alpha: number,
  mono: string,
): void {
  if (alpha <= 0.01) return;
  const from = { x: geo.x + geo.R * 1.02, y: geo.y };
  const mx = (from.x + target.x) / 2;

  ctx.strokeStyle = rgba(PALETTE.accent, 0.42 * alpha);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.bezierCurveTo(mx, from.y, mx, target.y, target.x, target.y);
  ctx.stroke();

  // three glyphs travel along it, each lap about 5.5 s
  ctx.fillStyle = rgba(PALETTE.light, 0.8 * alpha);
  ctx.font = `11px ${mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let k = 0; k < 3; k++) {
    const u = (t * 0.00018 + k / 3) % 1;
    const p = threadPoint(from, target, u);
    ctx.fillText(GLYPHS[(k * 7 + Math.floor(t / 300)) % GLYPHS.length], p.x, p.y);
  }

  ctx.fillStyle = rgba(PALETTE.accent, alpha);
  ctx.beginPath();
  ctx.arc(target.x, target.y, 2.5, 0, Math.PI * 2);
  ctx.fill();
}
