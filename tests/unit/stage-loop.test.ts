import { describe, expect, it, vi } from "vitest";
import { createLoop, type LoopDeps } from "@/features/stage/engine/loop";

/** A manual frame clock: `flush()` runs the callbacks queued for the next frame. */
function fakeClock() {
  let next = 1;
  let hidden = false;
  let listener: (() => void) | null = null;
  const queue = new Map<number, (t: number) => void>();
  const deps: LoopDeps = {
    raf: (cb) => {
      queue.set(next, cb);
      return next++;
    },
    cancel: (id) => {
      queue.delete(id);
    },
    isHidden: () => hidden,
    onVisibilityChange: (l) => {
      listener = l;
      return () => {
        listener = null;
      };
    },
  };
  return {
    deps,
    flush(times = 1) {
      for (let i = 0; i < times; i++) {
        const callbacks = [...queue.values()];
        queue.clear();
        for (const cb of callbacks) cb(i * 16);
      }
    },
    setHidden(value: boolean) {
      hidden = value;
      listener?.();
    },
  };
}

describe("createLoop", () => {
  it("runs every frame while continuous", () => {
    const clock = fakeClock();
    const frame = vi.fn();
    createLoop(frame, { continuous: true }, clock.deps).start();
    clock.flush(5);
    expect(frame).toHaveBeenCalledTimes(5);
  });

  it("draws only when poked while on demand, coalescing pokes into one frame", () => {
    const clock = fakeClock();
    const frame = vi.fn();
    const loop = createLoop(frame, { continuous: false }, clock.deps);
    loop.start();
    clock.flush(3);
    expect(frame).toHaveBeenCalledTimes(1); // the initial frame
    loop.poke();
    loop.poke();
    clock.flush(3);
    expect(frame).toHaveBeenCalledTimes(2);
  });

  it("switches into continuous mode when the visitor opts back into motion", () => {
    const clock = fakeClock();
    const frame = vi.fn();
    const loop = createLoop(frame, { continuous: false }, clock.deps);
    loop.start();
    clock.flush();
    frame.mockClear();
    loop.setContinuous(true);
    clock.flush(4);
    expect(frame).toHaveBeenCalledTimes(4);
    loop.setContinuous(false);
    clock.flush(4);
    expect(frame).toHaveBeenCalledTimes(5); // one last on-demand frame, then nothing
  });

  it("pauses while the tab is hidden and resumes when visible", () => {
    const clock = fakeClock();
    const frame = vi.fn();
    createLoop(frame, { continuous: true }, clock.deps).start();
    clock.flush(2);
    clock.setHidden(true);
    clock.flush(5);
    expect(frame).toHaveBeenCalledTimes(2);
    clock.setHidden(false);
    clock.flush(3);
    expect(frame).toHaveBeenCalledTimes(5);
  });

  it("stops for good when destroyed", () => {
    const clock = fakeClock();
    const frame = vi.fn();
    const loop = createLoop(frame, { continuous: true }, clock.deps);
    loop.start();
    loop.destroy();
    clock.flush(3);
    loop.poke();
    clock.flush(3);
    expect(frame).not.toHaveBeenCalled();
  });
});
