import { describe, expect, it, vi } from "vitest";
import { isMotion, MOTION, resolveMotion } from "@/features/stage/motion";
import { createStore } from "@/lib/store";

describe("resolveMotion", () => {
  it("defaults to lively", () => {
    expect(resolveMotion(null, false)).toBe("lively");
  });

  it("starts reduced-motion visitors on still", () => {
    expect(resolveMotion(null, true)).toBe("still");
  });

  it("lets a saved choice win over the defaults", () => {
    expect(resolveMotion("calm", true)).toBe("calm");
    expect(resolveMotion("lively", true)).toBe("lively");
  });

  it("ignores values that are not motion levels", () => {
    expect(resolveMotion("turbo", false)).toBe("lively");
    expect(isMotion("still")).toBe(true);
    expect(isMotion(3)).toBe(false);
  });
});

describe("motion levels", () => {
  it("get livelier from still to lively", () => {
    expect(MOTION.still.rate).toBe(0);
    expect(MOTION.still.rate).toBeLessThan(MOTION.calm.rate);
    expect(MOTION.calm.rate).toBeLessThan(MOTION.lively.rate);
    expect(MOTION.still.spin).toBeLessThan(MOTION.lively.spin);
  });
});

describe("createStore", () => {
  it("notifies subscribers only when a value changes", () => {
    const store = createStore({ a: 1, b: "x" });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set({ a: 1 });
    expect(listener).not.toHaveBeenCalled();

    store.set({ a: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get()).toEqual({ a: 2, b: "x" });

    unsubscribe();
    store.set({ b: "y" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
