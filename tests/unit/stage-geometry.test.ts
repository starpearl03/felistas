import { describe, expect, it } from "vitest";
import {
  columnWidth,
  dockedSphere,
  flashPlacement,
  heroSphere,
  introProgress,
  namePlacement,
  sphereAt,
} from "@/features/stage/engine/geometry";

describe("columnWidth", () => {
  it("mirrors clamp(340px, 30vw, 440px) and is zero on phones", () => {
    expect(columnWidth(390)).toBe(0);
    expect(columnWidth(899)).toBe(0);
    expect(columnWidth(1000)).toBe(340);
    expect(columnWidth(1440)).toBe(432);
    expect(columnWidth(2560)).toBe(440);
  });
});

describe("sphere geometry", () => {
  it("centres the hero sphere in the column on desktop", () => {
    expect(heroSphere(1440, 900)).toEqual({ x: 216, y: 297, R: 432 * 0.42 });
  });

  it("puts the hero sphere above the name on phones", () => {
    const s = heroSphere(390, 844);
    expect(s.x).toBe(195);
    expect(s.y).toBeCloseTo(168.8);
    expect(s.R).toBeCloseTo(Math.min(390 * 0.27, 844 * 0.13));
  });

  it("keeps the docked sphere large on desktop", () => {
    const dock = dockedSphere(1440, 900);
    expect(dock.R).toBeCloseTo(129.6);
    expect(dock.y).toBeCloseTo(64 + 129.6);
    expect(dock.R).toBeGreaterThan(100);
  });

  it("docks into the sheet slot on phones", () => {
    expect(dockedSphere(390, 844, { x: 36, y: 700 })).toEqual({ x: 36, y: 700, R: 17 });
  });

  it("interpolates from hero to dock", () => {
    const hero = heroSphere(1440, 900);
    const dock = dockedSphere(1440, 900);
    expect(sphereAt(hero, dock, 0)).toEqual(hero);
    expect(sphereAt(hero, dock, 1)).toEqual(dock);
    expect(sphereAt(hero, dock, 0.5).R).toBeCloseTo((hero.R + dock.R) / 2);
  });
});

describe("introProgress", () => {
  it("runs from 0 to 1 over 60% of a screen and stays monotonic", () => {
    expect(introProgress(0, 900)).toBe(0);
    expect(introProgress(540, 900)).toBe(1);
    expect(introProgress(5000, 900)).toBe(1);
    let prev = 0;
    for (let y = 0; y <= 540; y += 30) {
      const k = introProgress(y, 900);
      expect(k).toBeGreaterThanOrEqual(prev);
      prev = k;
    }
  });

  it("is zero before the viewport has a size", () => {
    expect(introProgress(100, 0)).toBe(0);
  });
});

describe("word placement", () => {
  it("centres the name in the content area on desktop", () => {
    const p = namePlacement(1440, 900);
    expect(p.x).toBeCloseTo(432 + (1440 - 432) / 2);
    expect(p.w).toBeCloseTo((1440 - 432) * 0.9);
  });

  it("uses the full width on phones", () => {
    expect(namePlacement(390, 844).x).toBe(195);
    expect(flashPlacement(390, 844).w).toBeCloseTo(351);
  });
});
