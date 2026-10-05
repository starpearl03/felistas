// Dusk, the glyph sphere (UI-SPEC §5). Port of `class Sphere` in docs/ui/Felistas Dusk.html.
// The thread to the current section arrives in P4.
import { clamp, lerp, pick } from "@/lib/math";
import type { MotionParams } from "../motion";
import { type FontFamilies, fitCanvas, type Surface } from "./canvas";
import type { Circle } from "./geometry";
import { GLYPHS, PALETTE, rgba } from "./palette";
import { burstSpread, type ShapeName, SHAPES, stepBurst } from "./shapes";

type Point = {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  /** ease speed toward the target */
  s: number;
  /** how far this point flies out during a burst */
  j: number;
  ch: string;
};

/** Conversation state the sphere reacts to; the companion writes it in P6. */
export type Voice = { speak: number; speakTarget: number; think: number };

export class GlyphSphere {
  private surface: Surface | null = null;
  private points: Point[];
  private yaw = 0;
  private pitch = 0.38;
  private gazeYaw = 0;
  private burst = 0;
  private lastSwap = 0;
  private current: ShapeName = "sphere";

  /** Cursor direction relative to the sphere, roughly -1..1 on each axis; null when the cursor is away */
  gaze: { x: number; y: number } | null = null;
  readonly voice: Voice = { speak: 0, speakTarget: 0, think: 0 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly fonts: FontFamilies,
    private readonly count: number,
    private readonly rand: () => number = Math.random,
  ) {
    this.points = Array.from({ length: count }, (_, i) => {
      const [x, y, z] = SHAPES.sphere(i, count);
      return { x, y, z, tx: x, ty: y, tz: z, s: 0.04, j: 1, ch: pick(GLYPHS, rand) };
    });
  }

  get shape(): ShapeName {
    return this.current;
  }

  /** The sphere's canvas surface, shared with overlays drawn after it (thread, flying headings) */
  get context(): CanvasRenderingContext2D | null {
    return this.surface?.ctx ?? null;
  }

  /** Dispatch and combine: the points fly apart and re-form as the new shape. `instant` skips the burst. */
  setShape(name: ShapeName, instant = false): void {
    if (name === this.current) return;
    this.current = name;
    const fn = SHAPES[name];
    this.points.forEach((p, i) => {
      const [x, y, z] = fn(i, this.count);
      p.tx = x;
      p.ty = y;
      p.tz = z;
      p.s = 0.025 + this.rand() * 0.05;
      p.j = 0.5 + this.rand() * 1.1;
      if (instant) {
        p.x = x;
        p.y = y;
        p.z = z;
      }
    });
    this.burst = instant ? 0 : 1;
  }

  resize(): void {
    this.surface = fitCanvas(this.canvas);
  }

  frame(t: number, geo: Circle, motion: MotionParams): void {
    if (!this.surface) return;
    const { ctx, w, h } = this.surface;
    ctx.clearRect(0, 0, w, h);

    const v = this.voice;
    v.speak = lerp(v.speak, v.speakTarget, 0.05);
    const sp = v.speak;
    const th = v.think;

    this.yaw += 0.0035 * motion.spin + sp * 0.006 + th * 0.02;
    const gx = this.gaze ? clamp(this.gaze.x, -1, 1) * 0.55 : 0;
    const gy = this.gaze ? clamp(this.gaze.y, -1, 1) * 0.45 : 0;
    this.pitch = lerp(this.pitch, 0.38 + gy, 0.05);
    this.gazeYaw = lerp(this.gazeYaw, gx, 0.05);

    const R = geo.R * (1 - th * 0.15);
    const { x: cx, y: cy } = geo;
    const cosY = Math.cos(this.yaw + this.gazeYaw);
    const sinY = Math.sin(this.yaw + this.gazeYaw);
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);
    const A = PALETTE.accent;

    const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.7);
    halo.addColorStop(0, rgba(A, 0.08 + sp * 0.07));
    halo.addColorStop(1, rgba(A, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.7, 0, Math.PI * 2);
    ctx.fill();

    if (motion.rate && t - this.lastSwap > 70) {
      this.lastSwap = t;
      for (let k = 0; k < 4 + sp * 14; k++)
        pick(this.points, this.rand).ch = pick(GLYPHS, this.rand);
    }

    this.burst = stepBurst(this.burst);
    const spread = burstSpread(this.burst);
    const small = R < 40;
    const back = PALETTE.base[1];
    const mid = PALETTE.hi[0];
    const front = PALETTE.light;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let lastSize = 0;

    for (const p of this.points) {
      p.x += (p.tx - p.x) * p.s;
      p.y += (p.ty - p.y) * p.s;
      p.z += (p.tz - p.z) * p.s;
      const ripple = (1 + sp * 0.05 * Math.sin(p.y * 7 + t * 0.008)) * (1 + spread * p.j * 0.85);
      const x1 = p.x * cosY - p.z * sinY;
      const z1 = p.x * sinY + p.z * cosY;
      const y1 = p.y * cosP - z1 * sinP;
      const z2 = p.y * sinP + z1 * cosP;
      const depth = (z2 + 1) / 2;
      const colour = depth > 0.78 ? front : depth > 0.45 ? mid : back;
      const alpha = (0.12 + depth * 0.82) * (1 - spread * 0.35);
      const X = cx + x1 * R * ripple;
      const Y = cy + y1 * R * ripple;
      ctx.fillStyle = rgba(colour, Number(alpha.toFixed(2)));
      if (small) {
        const s = 0.9 + depth * 1.3;
        ctx.fillRect(X - s / 2, Y - s / 2, s, s);
      } else {
        const size = Math.max(6, Math.round((R / 13) * (0.5 + depth * 0.65)));
        if (size !== lastSize) {
          ctx.font = `${size}px ${this.fonts.mono}`;
          lastSize = size;
        }
        ctx.fillText(p.ch, X, Y);
      }
    }

    if (th > 0.01) {
      ctx.strokeStyle = rgba(A, th * 0.8);
      ctx.lineWidth = 1.5;
      const start = t * 0.006;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.22 + 4, start, start + 1.3);
      ctx.stroke();
    }
  }
}
