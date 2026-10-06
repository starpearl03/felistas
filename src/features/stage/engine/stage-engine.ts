// Wires the glyph field, the sphere, the thread and the heading flights to the page. Runs outside React:
// state lives here and in the stage store, and React never re-renders per frame.
//
// It finds its page hooks by data attribute inside the stage root:
//   [data-scroller]  the snap scroller      [data-sec]       each section
//   [data-veil]      dims the field         [data-progress]  the scroll progress line
//   [data-anchor]    where the thread lands [data-fly]       a heading that flies out of the sphere
import { SECTION_IDS, type SectionId } from "@/features/content";
import { clamp, lerp } from "@/lib/math";
import { MOTION } from "../motion";
import { stageStore } from "../store";
import { loadCanvasFonts, readFontFamilies } from "./canvas";
import { Flights } from "./flights";
import {
  columnLift,
  columnWidth,
  detectSection,
  dockedSphere,
  flashPlacement,
  heroSphere,
  introProgress,
  namePlacement,
  sheetSlot,
  sphereAt,
} from "./geometry";
import { GlyphField, type Light } from "./glyph-field";
import { createLoop } from "./loop";
import { PALETTE } from "./palette";
import { SECTION_SHAPES } from "./shapes";
import { isBackgroundTarget } from "./ripple";
import { GlyphSphere } from "./sphere";
import { drawThread, nextThreadAlpha } from "./thread";

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
  // Still turns off the flights and the shape bursts (UI-SPEC §7)
  const isStill = () => stageStore.get().motion === "still";

  const fonts = readFontFamilies();
  const field = new GlyphField(glyphCanvas, fonts);
  const sphere = new GlyphSphere(sphereCanvas, fonts, window.innerWidth < 700 ? 240 : 380);
  const flights = new Flights();
  const scroller = root.querySelector<HTMLElement>("[data-scroller]");
  const veil = root.querySelector<HTMLElement>("[data-veil]");
  const progress = root.querySelector<HTMLElement>("[data-progress]");
  const slot = root.querySelector<HTMLElement>("[data-sphere-slot]");
  let lastLift = -1;
  // Phones: opening the sheet docks the sphere into it even on the intro
  let sheetDock = 0;
  const sections = scroller
    ? [...scroller.querySelectorAll<HTMLElement>("[data-sec]")].filter((el) =>
        isSectionId(el.dataset.sec),
      )
    : [];
  const sectionEl = (id: SectionId) => sections.find((el) => el.dataset.sec === id);
  const headingOf = (id: SectionId) => sectionEl(id)?.querySelector<HTMLElement>("[data-fly]");
  const anchorOf = (id: SectionId) => sectionEl(id)?.querySelector<HTMLElement>("[data-anchor]");

  const pointer = { x: OUTSIDE, y: OUTSIDE };
  const name = { word, place: namePlacement };
  let entered: SectionId | null = null;
  // The thread fades out from its old section before fading in to the next one
  const thread = { alpha: 0, section: null as SectionId | null };
  let lastMotion = stageStore.get().motion;
  let lastFlashId = 0;
  let flashTimer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  const syncAttributes = () => {
    const { motion, section } = stageStore.get();
    root.dataset.motion = motion;
    root.dataset.section = section;
    root.dataset.shape = sphere.shape;
  };

  /** Hides every heading that should fly in on entry, or shows them all on Still. */
  const resetHeadings = () => {
    for (const id of SECTION_IDS) {
      const heading = headingOf(id);
      if (!heading) continue;
      if (isStill() || id === entered) flights.show(heading);
      else flights.hide(heading);
    }
  };

  /** Entering a section: its heading flies out of the sphere and the sphere takes the section's form. */
  const enter = (next: SectionId, now: number) => {
    const prev = entered;
    entered = next;
    const still = isStill();
    if (prev) {
      const old = headingOf(prev);
      if (old && !still) flights.hide(old);
    }
    const heading = headingOf(next);
    if (heading) {
      if (still) flights.show(heading);
      else flights.launch(heading, now);
    }
    sphere.setShape(SECTION_SHAPES[next], still);
    stageStore.set({ shape: sphere.shape });
    syncAttributes();
  };

  const frame = (t: number) => {
    const W = root.clientWidth;
    const H = root.clientHeight;
    const motion = MOTION[stageStore.get().motion];
    const scrollTop = scroller?.scrollTop ?? 0;
    const viewport = scroller?.clientHeight ?? H;
    const phone = !columnWidth(W);
    sheetDock = lerp(sheetDock, phone && stageStore.get().chatOpen ? 1 : 0, onDemand() ? 1 : 0.15);
    const k = Math.max(introProgress(scrollTop, viewport), sheetDock);
    const origin = root.getBoundingClientRect();

    const current = detectSection(
      sections.map((el) => ({ id: el.dataset.sec as SectionId, top: el.offsetTop })),
      scrollTop,
      viewport,
    );
    if (current) {
      stageStore.set({ section: current });
      if (current !== entered) enter(current, t);
    }

    if (veil) veil.style.opacity = (k * 0.38).toFixed(3);
    if (progress && scroller) {
      const max = scroller.scrollHeight - scroller.clientHeight;
      progress.style.transform = `scaleX(${max > 0 ? clamp(scrollTop / max) : 0})`;
    }

    // The sphere glides from the hero position into the column and stays large (UI-SPEC §5.1)
    // On phones the sphere docks into the companion sheet's slot, wherever the sheet currently is
    const slotRect = slot?.getBoundingClientRect();
    const slotPoint =
      slotRect && slotRect.width > 0
        ? {
            x: slotRect.left - origin.left + slotRect.width / 2,
            y: slotRect.top - origin.top + slotRect.height / 2,
          }
        : sheetSlot(W, H);
    const hero = heroSphere(W, H);
    const dock = dockedSphere(W, H, slotPoint);
    const geo = sphereAt(hero, dock, k);
    const lift = columnWidth(W) ? columnLift(hero, dock, H, k) : 0;
    if (lift !== lastLift) {
      lastLift = lift;
      root.style.setProperty("--lift", `${lift}px`);
    }
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
    const voice = stageStore.get().voice;
    sphere.voice.think = voice === "think" ? 1 : 0;
    sphere.voice.speakTarget = voice === "speak" ? 1 : 0;
    sphere.frame(t, geo, motion);

    const ctx = sphere.context;
    if (!ctx) return;

    // Thread: desktop only, once docked, to the eyebrow of the section in view (UI-SPEC §5.2)
    const anchorPoint = (id: SectionId | null) => {
      const anchor = id && id !== "home" && columnWidth(W) ? anchorOf(id) : null;
      if (!anchor) return null;
      const r = anchor.getBoundingClientRect();
      return { x: r.left - origin.left - 10, y: r.top - origin.top + r.height / 2 };
    };
    const wanted = anchorPoint(current);
    let visible = false;
    if (current && wanted && thread.section !== current && thread.alpha > 0.02) {
      visible = false; // finish fading out of the previous section first
    } else if (current && wanted) {
      thread.section = current;
      visible = k > 0.9 && wanted.y > 40 && wanted.y < H - 40;
    }
    thread.alpha = nextThreadAlpha(thread.alpha, visible);
    const target = anchorPoint(thread.section);
    if (target) drawThread(ctx, t, geo, target, thread.alpha, fonts.mono);

    flights.draw(ctx, t, geo, origin);
  };

  const loop = createLoop(frame, { continuous: !onDemand() });
  const syncLoopMode = () => loop.setContinuous(!onDemand());

  const resize = () => {
    field.resize();
    sphere.resize();
    field.setWord(name.word, name.place, true);
    loop.poke();
  };

  // In on-demand mode a single poke would draw the sphere where the sheet was; keep drawing while
  // the sheet settles so the sphere lands in its slot
  let followTimer: ReturnType<typeof setInterval> | undefined;
  let lastOpen = stageStore.get().chatOpen;
  const follow = (ms: number) => {
    clearInterval(followTimer);
    const until = performance.now() + ms;
    followTimer = setInterval(() => {
      loop.poke();
      if (performance.now() > until) clearInterval(followTimer);
    }, 40);
  };

  const onStoreChange = () => {
    const { motion, flash, chatOpen } = stageStore.get();
    if (chatOpen !== lastOpen) {
      lastOpen = chatOpen;
      if (onDemand()) follow(600);
    }
    if (motion !== lastMotion) {
      lastMotion = motion;
      resetHeadings();
    }
    if (flash && flash.id !== lastFlashId) {
      lastFlashId = flash.id;
      field.flash(flash.word, flashPlacement, flash.ms, name);
      root.dataset.flash = flash.word;
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => {
        delete root.dataset.flash;
        // on-demand mode draws only when poked: redraw so the name returns
        loop.poke();
      }, flash.ms + 20);
    }
    syncAttributes();
    syncLoopMode();
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

  // A click (or tap) on the background sends a shockwave through the field; Still has none (UI-SPEC §7)
  const RIPPLE_STRENGTH = { still: 0, calm: 0.65, lively: 1 } as const;
  const onClick = (e: MouseEvent) => {
    const strength = RIPPLE_STRENGTH[stageStore.get().motion];
    if (!strength || !isBackgroundTarget(e.target)) return;
    const rect = root.getBoundingClientRect();
    field.ripple(e.clientX - rect.left, e.clientY - rect.top, performance.now(), strength);
    // counts the waves sent, for tests; the loop runs continuously whenever motion isn't Still
    root.dataset.ripple = String(Number(root.dataset.ripple ?? 0) + 1);
  };

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 140);
  };

  const unsubscribe = stageStore.subscribe(onStoreChange);
  reducedMotion.addEventListener("change", syncLoopMode);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerleave", onPointerLeave);
  root.addEventListener("click", onClick);
  scroller?.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);

  resetHeadings();
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
      clearTimeout(flashTimer);
      clearInterval(followTimer);
      reducedMotion.removeEventListener("change", syncLoopMode);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("click", onClick);
      scroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      // leave every heading readable if the stage goes away
      for (const id of SECTION_IDS) {
        const heading = headingOf(id);
        if (heading) flights.show(heading);
      }
    },
  };
}
