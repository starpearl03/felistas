// Wires the glyph field, the sphere and the loop to the page. Runs outside React: state lives here and
// in the stage store, and React never re-renders per frame.
import { MOTION } from "../motion";
import { stageStore } from "../store";
import { loadCanvasFonts, readFontFamilies } from "./canvas";
import { GlyphField, type Light } from "./glyph-field";
import { heroSphere, namePlacement } from "./geometry";
import { createLoop } from "./loop";
import { PALETTE } from "./palette";
import { GlyphSphere } from "./sphere";

export type StageEngine = { destroy(): void };

export type StageElements = {
  /** Full-viewport container; also receives the pointer events */
  root: HTMLElement;
  glyphCanvas: HTMLCanvasElement;
  sphereCanvas: HTMLCanvasElement;
  /** The word spelled in glyphs on the intro */
  word: string;
};

const OUTSIDE = -9999;

export function createStageEngine({
  root,
  glyphCanvas,
  sphereCanvas,
  word,
}: StageElements): StageEngine {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fonts = readFontFamilies();
  const field = new GlyphField(glyphCanvas, fonts);
  const sphere = new GlyphSphere(sphereCanvas, fonts, window.innerWidth < 700 ? 240 : 380);
  const pointer = { x: OUTSIDE, y: OUTSIDE };
  let destroyed = false;

  const syncAttributes = () => {
    root.dataset.motion = stageStore.get().motion;
    root.dataset.shape = sphere.shape;
  };

  const frame = (t: number) => {
    const W = root.clientWidth;
    const H = root.clientHeight;
    const motion = MOTION[stageStore.get().motion];
    const geo = heroSphere(W, H);
    const hasPointer = pointer.x > OUTSIDE;

    const lights: Light[] = [];
    if (hasPointer)
      lights.push({ x: pointer.x, y: pointer.y, r: 150, k: motion.light, cursor: true });
    lights.push({
      x: geo.x,
      y: geo.y,
      r: geo.R * 1.9 + sphere.voice.speak * 60,
      k: 0.16 + sphere.voice.speak * 0.18,
      color: PALETTE.hi[0],
    });

    field.frame(t, { motion, nameStrength: 1, boost: 1, lights, reduced });
    sphere.gaze = hasPointer
      ? { x: (pointer.x - geo.x) / (W * 0.5), y: (pointer.y - geo.y) / (H * 0.5) }
      : null;
    sphere.frame(t, geo, motion);
  };

  const loop = createLoop(frame, { reduced });

  const resize = () => {
    field.resize();
    sphere.resize();
    field.setWord(word, namePlacement, true);
    loop.poke();
  };

  const onPointerMove = (e: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    loop.poke();
  };
  const onPointerLeave = () => {
    pointer.x = OUTSIDE;
    pointer.y = OUTSIDE;
    loop.poke();
  };

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 140);
  };

  const unsubscribe = stageStore.subscribe(() => {
    syncAttributes();
    loop.poke();
  });

  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerleave", onPointerLeave);
  window.addEventListener("resize", onResize);

  syncAttributes();
  resize();
  loop.start();
  // Re-rasterise the name once the display face has loaded
  void loadCanvasFonts(fonts).then(() => {
    if (!destroyed) resize();
  });

  return {
    destroy() {
      destroyed = true;
      loop.destroy();
      field.destroy();
      unsubscribe();
      clearTimeout(resizeTimer);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
    },
  };
}
