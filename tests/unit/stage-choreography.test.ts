// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { SECTION_IDS } from "@/features/content";
import {
  FLY_MS,
  FLYING_CLASS,
  Flights,
  flightDuration,
  LETTER_DELAY_MS,
  letterProgress,
} from "@/features/stage/engine/flights";
import { SECTION_SHAPES, SHAPE_NAMES } from "@/features/stage/engine/shapes";
import { nextThreadAlpha, threadPoint } from "@/features/stage/engine/thread";

describe("section shapes", () => {
  it("gives every section a form of its own, starting on the sphere", () => {
    for (const id of SECTION_IDS) expect(SHAPE_NAMES).toContain(SECTION_SHAPES[id]);
    expect(new Set(Object.values(SECTION_SHAPES)).size).toBe(SECTION_IDS.length);
    expect(SECTION_SHAPES.home).toBe("sphere");
    expect(SECTION_SHAPES.projects).toBe("cube");
    expect(SECTION_SHAPES.contact).toBe("letter");
  });
});

describe("thread", () => {
  const from = { x: 100, y: 200 };
  const to = { x: 500, y: 80 };

  it("runs from the sphere edge to the eyebrow", () => {
    expect(threadPoint(from, to, 0)).toEqual(from);
    const end = threadPoint(from, to, 1);
    expect(end.x).toBeCloseTo(to.x);
    expect(end.y).toBeCloseTo(to.y);
  });

  it("stays between its ends", () => {
    for (let u = 0; u <= 1; u += 0.1) {
      const p = threadPoint(from, to, u);
      expect(p.x).toBeGreaterThanOrEqual(from.x - 1e-9);
      expect(p.x).toBeLessThanOrEqual(to.x + 1e-9);
      expect(p.y).toBeLessThanOrEqual(from.y + 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(to.y - 1e-9);
    }
  });

  it("fades in while visible and out otherwise", () => {
    let a = 0;
    for (let i = 0; i < 120; i++) a = nextThreadAlpha(a, true);
    expect(a).toBeGreaterThan(0.99);
    for (let i = 0; i < 120; i++) a = nextThreadAlpha(a, false);
    expect(a).toBeLessThan(0.01);
  });
});

describe("flight timing", () => {
  it("staggers letters 24 ms apart, each flying 950 ms", () => {
    expect(flightDuration(1)).toBe(FLY_MS);
    expect(flightDuration(13)).toBe(12 * LETTER_DELAY_MS + FLY_MS);
  });

  it("eases each letter from launch to landing", () => {
    expect(letterProgress(0, 48)).toBe(0);
    expect(letterProgress(48 + FLY_MS / 2, 48)).toBeCloseTo(0.5);
    expect(letterProgress(48 + FLY_MS, 48)).toBe(1);
    expect(letterProgress(99_999, 48)).toBe(1);
  });
});

describe("Flights", () => {
  const heading = () => {
    const h = document.createElement("h2");
    h.innerHTML = "Let's build <em>calm</em>";
    document.body.append(h);
    return h;
  };

  it("hides a heading until it is launched, then tracks the flight", () => {
    const flights = new Flights(() => 0.5);
    const h = heading();
    flights.hide(h);
    expect(h.classList.contains(FLYING_CLASS)).toBe(true);
    flights.launch(h, 0);
    expect(flights.active).toBe(1);
    expect(h.classList.contains(FLYING_CLASS)).toBe(true);
  });

  it("shows a heading at once and cancels its flight (Still)", () => {
    const flights = new Flights();
    const h = heading();
    flights.launch(h, 0);
    flights.show(h);
    expect(flights.active).toBe(0);
    expect(h.classList.contains(FLYING_CLASS)).toBe(false);
  });

  it("replaces a running flight when the same heading launches again", () => {
    const flights = new Flights();
    const h = heading();
    flights.launch(h, 0);
    flights.launch(h, 100);
    expect(flights.active).toBe(1);
  });
});
