// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  isBackgroundTarget,
  liveRipples,
  MAX_RIPPLES,
  RIPPLE_MS,
  RIPPLE_SPEED,
  rippleBand,
} from "@/features/stage/engine/ripple";

describe("the background shockwave", () => {
  it("acts on the ring and nowhere else", () => {
    const age = 400;
    const ring = age * RIPPLE_SPEED;
    expect(rippleBand(ring, age)).toBeGreaterThan(0.4);
    expect(rippleBand(ring - 200, age)).toBe(0);
    expect(rippleBand(ring + 200, age)).toBe(0);
  });

  it("fades as it ages, ends on time, and scales with strength", () => {
    const at = (age: number, s = 1) => rippleBand(age * RIPPLE_SPEED, age, s);
    expect(at(200)).toBeGreaterThan(at(800));
    expect(at(RIPPLE_MS)).toBe(0);
    expect(rippleBand(0, -10)).toBe(0);
    expect(at(300, 0.5)).toBeCloseTo(at(300) / 2);
  });

  it("drops finished waves and keeps only the newest few", () => {
    const waves = Array.from({ length: 6 }, (_, i) => ({ x: 0, y: 0, t0: i * 100, strength: 1 }));
    const live = liveRipples(waves, 600);
    expect(live).toHaveLength(MAX_RIPPLES);
    expect(live.at(-1)?.t0).toBe(500);
    expect(liveRipples(waves, 500 + RIPPLE_MS)).toHaveLength(0);
  });

  it("starts only from the background, never from controls, text or the companion", () => {
    document.body.innerHTML = `
      <section id="bg"><div id="gap"></div><p id="text">Hi</p><button id="btn"><span id="inner">Go</span></button></section>
      <aside><div id="chat"></div></aside>`;
    const el = (id: string) => document.getElementById(id);
    expect(isBackgroundTarget(el("bg"))).toBe(true);
    expect(isBackgroundTarget(el("gap"))).toBe(true);
    expect(isBackgroundTarget(el("text"))).toBe(false);
    expect(isBackgroundTarget(el("inner"))).toBe(false);
    expect(isBackgroundTarget(el("chat"))).toBe(false);
    expect(isBackgroundTarget(null)).toBe(false);
  });
});
