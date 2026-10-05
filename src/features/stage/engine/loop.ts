// The single requestAnimationFrame loop for the whole stage.
// It pauses while the tab is hidden. In on-demand mode (reduced motion with the Still level) it never
// runs continuously: it draws one frame each time `poke()` is called (pointer, scroll, resize, store).
// The mode can change at any time, because a visitor may opt back into motion with the switch.

export type Loop = {
  start(): void;
  /** Switches between continuous animation and drawing only on demand */
  setContinuous(continuous: boolean): void;
  /** Requests one frame in on-demand mode; a no-op while the loop runs continuously */
  poke(): void;
  destroy(): void;
};

export type LoopDeps = {
  raf: (cb: (t: number) => void) => number;
  cancel: (id: number) => void;
  isHidden: () => boolean;
  onVisibilityChange: (listener: () => void) => () => void;
};

const browserDeps = (): LoopDeps => ({
  raf: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
  isHidden: () => document.hidden,
  onVisibilityChange: (listener) => {
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  },
});

export function createLoop(
  frame: (t: number) => void,
  opts: { continuous: boolean },
  deps: LoopDeps = browserDeps(),
): Loop {
  let raf = 0;
  let running = false;
  let continuous = opts.continuous;
  let pending = false;
  let removeVisibility: (() => void) | null = null;

  const tick = (t: number) => {
    frame(t);
    raf = deps.raf(tick);
  };

  const halt = () => {
    deps.cancel(raf);
    raf = 0;
  };

  const resume = () => {
    halt();
    raf = deps.raf(tick);
  };

  function poke() {
    if (!running || continuous || pending) return;
    pending = true;
    deps.raf((t) => {
      pending = false;
      if (running) frame(t);
    });
  }

  const sync = () => {
    if (!running) return;
    if (deps.isHidden()) halt();
    else if (continuous) resume();
    else {
      halt();
      poke();
    }
  };

  return {
    start() {
      if (running) return;
      running = true;
      removeVisibility = deps.onVisibilityChange(sync);
      sync();
    },
    setContinuous(next) {
      if (next === continuous) return;
      continuous = next;
      sync();
    },
    poke,
    destroy() {
      running = false;
      halt();
      removeVisibility?.();
      removeVisibility = null;
    },
  };
}
