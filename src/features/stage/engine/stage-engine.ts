// Wires the glyph field, the sphere and the loop to the page. Runs outside React: state lives here and
// in the stage store, and React never re-renders per frame.
//
// It finds its page hooks by data attribute inside the stage root:
//   [data-scroller]  the snap scroller      [data-sec]       each section
//   [data-veil]      dims the field         [data-progress]  the scroll progress line
import { SECTION_IDS, type SectionId } from "@/features/content";
import { clamp, lerp } from "@/lib/math";
import { MOTION } from "../motion";
import { stageStore } from "../store";
import { loadCanvasFonts, readFontFamilies } from "./canvas";
import {
  detectSection,
  dockedSphere,
  heroSphere,
  introProgress,
  namePlacement,
  sheetSlot,
  sphereAt,
} from "./geometry";
import { GlyphField, type Light } from "./glyph-field";
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

const isSectionId = (value: string | undefined): value is SectionId =>
  !!value && (SECTION_IDS as readonly string[]).includes(value);

export function createStageEngine({
  root,
  glyphCanvas,
  sphereCanvas,
  word,
}: StageElements): StageEngine {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // On-demand drawing only while the visitor prefers reduced motion AND stays on Still.
  // An explicit Calm or Lively choice wins over the OS preference (UI-SPEC §7).
  const onDemand = () => reducedMotion.matches && stageStore.get().motion === "still";
  const fonts = readFontFamilies();
  const field = new GlyphField(glyphCanvas, fonts);
  const sphere = new GlyphSphere(sphereCanvas, fonts, window.innerWidth < 700 ? 240 : 380);
  const scroller = root.querySelector<HTMLElement>("[data-scroller]");
  const veil = root.querySelector<HTMLElement>("[data-veil]");
  const progress = root.querySelector<HTMLElement>("[data-progress]");
  const sections = scroller
    ? [...scroller.querySelectorAll<HTMLElement>("[data-sec]")].filter((el) =>
        isSectionId(el.dataset.sec),
      )
    : [];
  const pointer = { x: OUTSIDE, y: OUTSIDE };
  let destroyed = false;

  const syncAttributes = () => {
    const { motion, section } = stageStore.get();
    root.dataset.motion = motion;
    root.dataset.section = section;
    root.dataset.shape = sphere.shape;
  };

  const frame = (t: number) => {
    const W = root.clientWidth;
    const H = root.clientHeight;
    const motion = MOTION[stageStore.get().motion];
    const scrollTop = scroller?.scrollTop ?? 0;
    const viewport = scroller?.clientHeight ?? H;
    const k = introProgress(scrollTop, viewport);

    const current = detectSection(
      sections.map((el) => ({ id: el.dataset.sec as SectionId, top: el.offsetTop })),
      scrollTop,
      viewport,
    );
    if (current) stageStore.set({ section: current });

    if (veil) veil.style.opacity = (k * 0.38).toFixed(3);
    if (progress && scroller) {
      const max = scroller.scrollHeight - scroller.clientHeight;
      progress.style.transform = `scaleX(${max > 0 ? clamp(scrollTop / max) : 0})`;
    }

    // The sphere glides from the hero position into the column and stays large (UI-SPEC §5.1)
    const geo = sphereAt(heroSphere(W, H), dockedSphere(W, H, sheetSlot(W, H)), k);
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

    field.frame(t, {
      motion,
      nameStrength: clamp(1 - k * 1.2),
      boost: lerp(1, 0.95, k),
      lights,
      reduced: onDemand(),
    });
    sphere.gaze = hasPointer
      ? { x: (pointer.x - geo.x) / (W * 0.5), y: (pointer.y - geo.y) / (H * 0.5) }
      : null;
    sphere.frame(t, geo, motion);
  };

  const loop = createLoop(frame, { continuous: !onDemand() });
  const syncLoopMode = () => loop.setContinuous(!onDemand());

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
  const onScroll = () => loop.poke();

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 140);
  };

  const unsubscribe = stageStore.subscribe(() => {
    syncAttributes();
    syncLoopMode();
    loop.poke();
  });
  reducedMotion.addEventListener("change", syncLoopMode);

  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerleave", onPointerLeave);
  scroller?.addEventListener("scroll", onScroll, { passive: true });
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
      reducedMotion.removeEventListener("change", syncLoopMode);
      clearTimeout(resizeTimer);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      scroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    },
  };
}
