// Glyph streams from the sphere to the current section's eyebrow (UI-SPEC §5.2). There is no line: the
// glyphs themselves leave the sphere and feed the label, along a path shaped like the sphere's form.
import { clamp, lerp, smoothstep } from "@/lib/math";
import type { Motion } from "../motion";
import type { Circle } from "./geometry";
import { GLYPHS, PALETTE, rgba } from "./palette";
import type { ShapeName } from "./shapes";
import { type Point, threadPoint } from "./thread";

export type StreamStyle = "spiral" | "circuit" | "helix" | "orbit" | "glide";

/** How glyphs travel in each form. The intro has no stream. */
export const SHAPE_STREAMS: Record<ShapeName, StreamStyle | null> = {
  sphere: null,
  torus: "spiral",
  cube: "circuit",
  helix: "helix",
  ring: "orbit",
  letter: "glide",
};

/** Parallel paths per style: the helix has two strands, the circuit three traces */
export const STREAM_LANES: Record<StreamStyle, number> = {
  spiral: 3,
  circuit: 3,
  helix: 2,
  orbit: 2,
  glide: 3,
};

const TAU = Math.PI * 2;

/** A point on a stream and its depth (-1 behind, 1 in front), used for size and brightness. */
export type StreamPoint = Point & { z: number };

const unit = (from: Point, to: Point) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len, nx: -dy / len, ny: dx / len };
};

/** Tick-tock progress: holds, then jumps to the next of `steps` stops, like data on a bus. */
export const stepped = (u: number, steps: number): number => {
  const s = clamp(u) * steps;
  const i = Math.min(Math.floor(s), steps - 1);
  return (i + smoothstep(clamp(s - i))) / steps;
};

/** Right-angle trace: out level from the sphere, along a riser, then level into the label. */
function circuit(from: Point, to: Point, u: number, lane: number): StreamPoint {
  const mx = lerp(from.x, to.x, 0.3 + lane * 0.14);
  const a = Math.abs(mx - from.x);
  const b = Math.abs(to.y - from.y);
  const c = Math.abs(to.x - mx);
  const total = a + b + c || 1;
  let d = stepped(u, 5) * total;
  if (d <= a) return { x: from.x + Math.sign(mx - from.x) * d, y: from.y, z: 0.6 };
  d -= a;
  if (d <= b) return { x: mx, y: from.y + Math.sign(to.y - from.y) * d, z: 0.6 };
  d -= b;
  return { x: mx + Math.sign(to.x - mx) * d, y: to.y, z: 0.6 };
}

/** Rides the flat ring around the sphere, then slingshots off its top toward the label. */
function orbit(from: Point, to: Point, u: number, geo: Circle): StreamPoint {
  const SPLIT = 0.42;
  const FLAT = 0.38;
  const ring = geo.R * 1.22;
  const a0 = Math.atan2((from.y - geo.y) / FLAT, from.x - geo.x);
  // leave from the top of the ring (-90°), where the tangent points right, toward the content
  let sweep = (((-Math.PI / 2 - a0) % TAU) + TAU) % TAU;
  if (sweep < Math.PI) sweep += TAU;
  const at = (v: number) => {
    const a = a0 + sweep * v;
    return { x: geo.x + Math.cos(a) * ring, y: geo.y + Math.sin(a) * ring * FLAT, z: Math.sin(a) };
  };
  if (u < SPLIT) {
    const v = smoothstep(u / SPLIT);
    const p = at(v);
    const join = smoothstep(clamp(v * 4));
    return { x: lerp(from.x, p.x, join), y: lerp(from.y, p.y, join), z: p.z };
  }
  const w = smoothstep((u - SPLIT) / (1 - SPLIT));
  const p = at(1);
  const c1 = { x: p.x + 140, y: p.y };
  const c2 = { x: to.x - 90, y: to.y };
  const iw = 1 - w;
  return {
    x: iw ** 3 * p.x + 3 * iw * iw * w * c1.x + 3 * iw * w * w * c2.x + w ** 3 * to.x,
    y: iw ** 3 * p.y + 3 * iw * iw * w * c1.y + 3 * iw * w * w * c2.y + w ** 3 * to.y,
    z: lerp(-1, 0.6, w),
  };
}

/**
 * Where a glyph is `u` (0..1) of the way along its stream. Pure, so each form's path is unit-tested.
 * Every path starts at `from` (a glyph on the sphere) and ends at `to` (just left of the eyebrow).
 */
export function streamPoint(
  style: StreamStyle,
  from: Point,
  to: Point,
  u: number,
  lane: number,
  geo: Circle,
): StreamPoint {
  const { dx, dy, nx, ny } = unit(from, to);
  const env = Math.sin(Math.PI * clamp(u));
  switch (style) {
    case "circuit":
      return circuit(from, to, u, lane);
    case "orbit":
      return orbit(from, to, u, geo);
    case "spiral": {
      // loops around the path like a coil wound off the torus
      const base = threadPoint(from, to, u);
      const phi = u * TAU * 2 + lane * 2.1;
      const rad = 20 * env * (1 - u * 0.35);
      return {
        x: base.x + nx * Math.cos(phi) * rad + dx * Math.sin(phi) * rad * 0.45,
        y: base.y + ny * Math.cos(phi) * rad + dy * Math.sin(phi) * rad * 0.45,
        z: Math.sin(phi),
      };
    }
    case "helix": {
      // two strands winding around each other, half a turn apart
      const base = threadPoint(from, to, u);
      const phi = u * TAU * 1.6 + lane * Math.PI;
      const amp = 16 * Math.pow(env, 0.7);
      return {
        x: base.x + nx * Math.sin(phi) * amp,
        y: base.y + ny * Math.sin(phi) * amp,
        z: Math.cos(phi),
      };
    }
    case "glide": {
      // a paper plane: up in a high arc, then gliding down with a little sway
      const apex = {
        x: lerp(from.x, to.x, 0.42),
        y: Math.min(from.y, to.y) - 70 - lane * 28,
      };
      const iu = 1 - u;
      const sway = Math.sin(u * TAU * 1.5 + lane) * 32 * u * iu * iu;
      return {
        x: iu * iu * from.x + 2 * iu * u * apex.x + u * u * to.x + nx * sway,
        y: iu * iu * from.y + 2 * iu * u * apex.y + u * u * to.y + ny * sway,
        z: 0.4 + 0.4 * Math.cos(u * TAU * 1.5 + lane),
      };
    }
  }
}

/** A glyph lifted off the sphere, in screen space. */
export type SphereGlyph = Point & { ch: string; size: number };

type Mote = {
  style: StreamStyle;
  lane: number;
  t0: number;
  dur: number;
  /** where it left the sphere, relative to the sphere's centre in radii, so it follows the sphere */
  rx: number;
  ry: number;
  ch: string;
  size: number;
};

const RATE: Record<Motion, { every: number; dur: number }> = {
  still: { every: 0, dur: 0 },
  // a few glyphs at a time, drifting: noticeable, never busy
  calm: { every: 560, dur: 4200 },
  lively: { every: 340, dur: 3400 },
};

/** Glyphs frozen along the path on Still: the connection shows, nothing moves. */
const STILL_STOPS = [0.16, 0.34, 0.52, 0.7, 0.86];

const ARRIVAL_PULSE_MS = 700;
const MAX_MOTES = 16;

export type StreamFrame = {
  geo: Circle;
  /** Just left of the eyebrow */
  target: Point;
  /** 0..1: fades the whole stream in and out */
  alpha: number;
  shape: ShapeName;
  motion: Motion;
  /** The eyebrow's word: arriving glyphs decode into its letters */
  label: string;
  mono: string;
  /** A glyph on the sphere's lit side facing the target, or null before the sphere has drawn */
  sample: () => SphereGlyph | null;
};

export class GlyphStreams {
  private motes: Mote[] = [];
  private lastEmit = 0;
  private lastArrival = -Infinity;
  private lane = 0;

  constructor(private readonly rand: () => number = Math.random) {}

  get active(): number {
    return this.motes.length;
  }

  private emit(t: number, style: StreamStyle, f: StreamFrame, dur: number): void {
    const g = f.sample();
    if (!g || f.geo.R <= 0) return;
    this.lane = (this.lane + 1) % STREAM_LANES[style];
    this.motes.push({
      style,
      lane: this.lane,
      t0: t,
      dur: dur * (0.9 + this.rand() * 0.2),
      rx: (g.x - f.geo.x) / f.geo.R,
      ry: (g.y - f.geo.y) / f.geo.R,
      ch: g.ch,
      size: g.size,
    });
    if (this.motes.length > MAX_MOTES) this.motes.shift();
  }

  draw(ctx: CanvasRenderingContext2D, t: number, f: StreamFrame): void {
    const style = SHAPE_STREAMS[f.shape];
    const { geo, target } = f;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (f.motion === "still") {
      this.motes = [];
      if (!style || f.alpha <= 0.01) return;
      this.drawStill(ctx, style, f);
      return;
    }

    const rate = RATE[f.motion];
    if (style && f.alpha > 0.6 && t - this.lastEmit > rate.every) {
      this.lastEmit = t;
      this.emit(t, style, f, rate.dur);
    }

    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      const u = (t - m.t0) / m.dur;
      if (u >= 1) {
        this.motes.splice(i, 1);
        this.lastArrival = t;
        continue;
      }
      const from = { x: geo.x + m.rx * geo.R, y: geo.y + m.ry * geo.R };
      // eased, so each glyph drifts off the sphere and settles into the label
      const e = smoothstep(u);
      const p = streamPoint(m.style, from, target, e, m.lane, geo);
      const depth = (p.z + 1) / 2;
      const settle = smoothstep(clamp((u - 0.7) / 0.3));
      // fades in as it leaves and out as it lands, so nothing pops
      const a = f.alpha * clamp(u / 0.15) * clamp((1 - u) / 0.12) * (0.3 + depth * 0.45);
      if (a <= 0.01) continue;
      const size = lerp(m.size, 10, e) * (0.85 + depth * 0.25);
      // arriving glyphs decode, once, into a letter of the label
      const ch =
        settle > 0.5 && f.label
          ? f.label[(m.lane * 3 + Math.floor(m.t0 / 120)) % f.label.length]
          : m.ch;
      ctx.font = `${size.toFixed(1)}px ${f.mono}`;
      ctx.fillStyle = rgba(settle > 0.5 ? PALETTE.accent : PALETTE.light, Number(a.toFixed(3)));
      ctx.fillText(ch, p.x, p.y);
    }

    // the anchor drinks the glyphs in: it swells a little each time one lands
    if (f.alpha > 0.01) {
      const pulse = clamp(1 - (t - this.lastArrival) / ARRIVAL_PULSE_MS);
      this.drawAnchor(ctx, target, f.alpha, pulse);
    }
  }

  private drawStill(ctx: CanvasRenderingContext2D, style: StreamStyle, f: StreamFrame): void {
    const { geo, target } = f;
    const from = { x: geo.x + geo.R * 0.9, y: geo.y };
    const lanes = STREAM_LANES[style];
    for (let lane = 0; lane < lanes; lane++) {
      STILL_STOPS.forEach((u, i) => {
        const p = streamPoint(style, from, target, (u + lane * 0.06) % 1, lane, geo);
        const depth = (p.z + 1) / 2;
        ctx.font = `${(9 + depth * 3).toFixed(1)}px ${f.mono}`;
        ctx.fillStyle = rgba(PALETTE.light, Number((f.alpha * (0.25 + depth * 0.45)).toFixed(3)));
        ctx.fillText(GLYPHS[(i * 7 + lane * 11) % GLYPHS.length], p.x, p.y);
      });
    }
    this.drawAnchor(ctx, target, f.alpha, 0);
  }

  private drawAnchor(ctx: CanvasRenderingContext2D, at: Point, alpha: number, pulse: number) {
    if (pulse > 0.01) {
      ctx.fillStyle = rgba(PALETTE.accent, 0.12 * pulse * alpha);
      ctx.beginPath();
      ctx.arc(at.x, at.y, 4 + pulse * 4, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = rgba(PALETTE.accent, alpha);
    ctx.beginPath();
    ctx.arc(at.x, at.y, 2.5 + pulse * 1.2, 0, TAU);
    ctx.fill();
  }
}
