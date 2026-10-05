// The single requestAnimationFrame loop for the whole stage.
// It pauses while the tab is hidden. With reduced motion it never runs continuously:
// it draws one frame each time `poke()` is called (pointer, scroll, resize, store changes).

export type Loop = {
  start(): void;
  /** Requests one frame when reduced motion is on; a no-op while the loop runs continuously */
  poke(): void;
  destroy(): void;
};

export function createLoop(frame: (t: number) => void, opts: { reduced: boolean }): Loop {
  let raf = 0;
  let running = false;
  let pending = false;

  const tick = (t: number) => {
    frame(t);
    raf = requestAnimationFrame(tick);
  };

  const resume = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  };

  const onVisibility = () => {
    if (!running) return;
    if (document.hidden) cancelAnimationFrame(raf);
    else if (opts.reduced) poke();
    else resume();
  };

  function poke() {
    if (!running || !opts.reduced || pending) return;
    pending = true;
    requestAnimationFrame((t) => {
      pending = false;
      if (running) frame(t);
    });
  }

  return {
    start() {
      if (running) return;
      running = true;
      document.addEventListener("visibilitychange", onVisibility);
      if (opts.reduced) poke();
      else if (!document.hidden) resume();
    },
    poke,
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
