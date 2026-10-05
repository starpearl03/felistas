import { describe, expect, it } from "vitest";
import {
  BURST_DECAY,
  burstSpread,
  SHAPE_NAMES,
  SHAPES,
  stepBurst,
} from "@/features/stage/engine/shapes";

describe("sphere shapes", () => {
  for (const n of [240, 380]) {
    for (const name of SHAPE_NAMES) {
      it(`${name} with ${n} points stays finite and inside the unit cube`, () => {
        const points = Array.from({ length: n }, (_, i) => SHAPES[name](i, n));
        expect(points).toHaveLength(n);
        for (const p of points) {
          for (const v of p) {
            expect(Number.isFinite(v)).toBe(true);
            expect(Math.abs(v)).toBeLessThanOrEqual(1.0001);
          }
        }
        // the form is spread out, not collapsed onto a few points
        const distinct = new Set(points.map((p) => p.map((v) => v.toFixed(3)).join(",")));
        expect(distinct.size).toBeGreaterThan(n * 0.5);
      });
    }
  }

  it("places sphere points on the unit sphere", () => {
    for (let i = 0; i < 380; i++) {
      const [x, y, z] = SHAPES.sphere(i, 380);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 6);
    }
  });

  it("puts every cube point on a face", () => {
    for (let i = 0; i < 380; i++) {
      const p = SHAPES.cube(i, 380);
      expect(Math.max(...p.map(Math.abs))).toBeCloseTo(0.62, 6);
    }
  });
});

describe("dispatch and combine burst", () => {
  it("decays by the burst factor each frame", () => {
    expect(stepBurst(1)).toBeCloseTo(BURST_DECAY);
  });

  it("settles to exactly zero within a few seconds of frames", () => {
    let b = 1;
    let frames = 0;
    while (b > 0 && frames < 1000) {
      b = stepBurst(b);
      frames++;
    }
    expect(b).toBe(0);
    expect(frames).toBeLessThan(250);
  });

  it("pushes out most in the middle of the burst and not at its ends", () => {
    expect(burstSpread(1)).toBeCloseTo(0);
    expect(burstSpread(0)).toBe(0);
    expect(burstSpread(0.5)).toBeCloseTo(1);
    expect(burstSpread(0.25)).toBeGreaterThan(0);
  });
});
