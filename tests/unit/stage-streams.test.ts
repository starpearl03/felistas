import { describe, expect, it } from "vitest";
import { SHAPE_NAMES } from "@/features/stage/engine/shapes";
import {
  GlyphStreams,
  SHAPE_STREAMS,
  STREAM_LANES,
  type StreamStyle,
  stepped,
  streamPoint,
} from "@/features/stage/engine/streams";

const geo = { x: 200, y: 160, R: 90 };
const from = { x: 285, y: 150 };
const to = { x: 470, y: 120 };
const STYLES: StreamStyle[] = ["spiral", "circuit", "helix", "orbit", "glide"];

describe("glyph streams", () => {
  it("give every form but the intro's its own way of travelling", () => {
    expect(SHAPE_STREAMS.sphere).toBeNull();
    const styles = SHAPE_NAMES.filter((s) => s !== "sphere").map((s) => SHAPE_STREAMS[s]);
    expect(new Set(styles).size).toBe(styles.length);
  });

  it.each(STYLES)("%s leaves the sphere glyph and lands on the eyebrow", (style) => {
    for (let lane = 0; lane < STREAM_LANES[style]; lane++) {
      const start = streamPoint(style, from, to, 0, lane, geo);
      const end = streamPoint(style, from, to, 1, lane, geo);
      expect(start.x).toBeCloseTo(from.x, 5);
      expect(start.y).toBeCloseTo(from.y, 5);
      expect(end.x).toBeCloseTo(to.x, 5);
      expect(end.y).toBeCloseTo(to.y, 5);
    }
  });

  it.each(STYLES)("%s keeps its depth in range and its path finite", (style) => {
    for (let u = 0; u <= 1; u += 0.01) {
      const p = streamPoint(style, from, to, u, 1, geo);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("runs the circuit at right angles only", () => {
    let prev = streamPoint("circuit", from, to, 0, 0, geo);
    for (let u = 0.01; u <= 1; u += 0.01) {
      const p = streamPoint("circuit", from, to, u, 0, geo);
      const moved = Math.abs(p.x - prev.x) > 1e-6 && Math.abs(p.y - prev.y) > 1e-6;
      // a step may turn a corner, but never cuts diagonally across a whole leg
      if (moved) expect(Math.min(Math.abs(p.x - prev.x), Math.abs(p.y - prev.y))).toBeLessThan(40);
      prev = p;
    }
  });

  it("takes the orbit around the sphere before it heads for the label", () => {
    const early = streamPoint("orbit", from, to, 0.25, 0, geo);
    expect(Math.hypot(early.x - geo.x, (early.y - geo.y) / 0.38)).toBeGreaterThan(geo.R);
  });

  it("winds the helix's two strands on opposite sides", () => {
    const a = streamPoint("helix", from, to, 0.3, 0, geo);
    const b = streamPoint("helix", from, to, 0.3, 1, geo);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    expect(Math.hypot(a.x - mid.x, a.y - mid.y)).toBeGreaterThan(5);
    expect(Math.sign(a.z)).not.toBe(Math.sign(b.z));
  });

  it("steps forward in hops and never goes back", () => {
    let last = 0;
    for (let u = 0; u <= 1; u += 0.005) {
      const s = stepped(u, 8);
      expect(s).toBeGreaterThanOrEqual(last - 1e-9);
      last = s;
    }
    expect(stepped(1, 8)).toBe(1);
  });

  it("emits nothing on Still and nothing before the sphere has drawn", () => {
    const calls: string[] = [];
    const ctx = new Proxy({} as CanvasRenderingContext2D, {
      get: (_t, key) =>
        typeof key === "string" && key !== "then" ? () => calls.push(key) : undefined,
      set: () => true,
    });
    const streams = new GlyphStreams(() => 0.5);
    const frame = {
      geo,
      target: to,
      alpha: 1,
      shape: "helix" as const,
      label: "EXPERIENCE",
      mono: "monospace",
    };
    streams.draw(ctx, 1000, { ...frame, motion: "still", sample: () => from && null });
    expect(streams.active).toBe(0);
    streams.draw(ctx, 1000, { ...frame, motion: "lively", sample: () => null });
    expect(streams.active).toBe(0);
    streams.draw(ctx, 2000, {
      ...frame,
      motion: "lively",
      sample: () => ({ ...from, ch: "A", size: 9 }),
    });
    expect(streams.active).toBe(1);
  });
});
