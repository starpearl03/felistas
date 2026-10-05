// The living glyph field (UI-SPEC §4). Port of `class Glyphs` in docs/ui/Felistas Dusk.html.
import { lerp, pick } from "@/lib/math";
import type { MotionParams } from "../motion";
import { type FontFamilies, fitCanvas } from "./canvas";
import type { Placement } from "./geometry";
import { GLYPHS, PALETTE, type RGB } from "./palette";

type Cell = {
  ch: string;
  /** current, start and target colour of the colour ease */
  c: number[];
  s: number[];
  t: number[];
  /** colour ease progress 0..1 */
  p: number;
  /** word-mask strength, eased toward `mt` at the cell's own speed `sp` */
  m: number;
  mt: number;
  sp: number;
  /** highlight colour used when lit */
  h: RGB;
};

export type Light = {
  x: number;
  y: number;
  r: number;
  k: number;
  color?: RGB;
  /** The cursor light also brightens the name and repels glyphs */
  cursor?: boolean;
};

export type PlaceFn = (W: number, H: number) => Placement;

export type FieldFrame = {
  motion: MotionParams;
  /** How strongly the word mask is lit (fades as the visitor leaves the intro) */
  nameStrength: number;
  /** Extra brightness multiplier */
  boost: number;
  lights: Light[];
  /** Reduced motion: draw every requested frame, ease the mask instantly */
  reduced: boolean;
};

const TICK_MS = 45;
const DRAW_MS = 33;
const REPEL_RADIUS = 140;
const REPEL_PUSH = 18;

export class GlyphField {
  private ctx: CanvasRenderingContext2D | null = null;
  private W = 0;
  private H = 0;
  private cw = 10;
  private rh = 18;
  private cols = 0;
  private cells: Cell[] = [];
  private word: string | null = null;
  private place: PlaceFn | null = null;
  private lastTick = 0;
  private lastDraw = 0;
  private flashUntil = 0;
  private flashTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly fonts: FontFamilies,
    private readonly rand: () => number = Math.random,
  ) {}

  private baseColour(): number[] {
    return [...pick(PALETTE.base, this.rand)];
  }

  resize(): void {
    const surface = fitCanvas(this.canvas);
    if (!surface) return;
    this.ctx = surface.ctx;
    this.W = surface.w;
    this.H = surface.h;
    const small = this.W < 640;
    this.cw = small ? 7 : 10;
    this.rh = small ? 13 : 18;
    this.cols = Math.ceil(this.W / this.cw);
    const rows = Math.ceil(this.H / this.rh);
    this.cells = Array.from({ length: this.cols * rows }, () => {
      const c = this.baseColour();
      return {
        ch: pick(GLYPHS, this.rand),
        c: [...c],
        s: c,
        t: c,
        p: 1,
        m: 0,
        mt: 0,
        sp: 0.05 + this.rand() * 0.09,
        h: pick(PALETTE.hi, this.rand),
      };
    });
    this.ctx.font = `${small ? 11 : 14}px ${this.fonts.mono}`;
    this.ctx.textBaseline = "top";
    if (this.word && this.place) this.setWord(this.word, this.place, true);
  }

  /** Rasterises a word in the display face, one pixel per cell, and marks the cells inside it. */
  setWord(word: string, place: PlaceFn, instant = false): void {
    this.word = word;
    this.place = place;
    if (!this.cells.length) return;
    const rows = this.cells.length / this.cols;
    const off = document.createElement("canvas");
    off.width = this.cols;
    off.height = rows;
    const x = off.getContext("2d", { willReadFrequently: true });
    if (!x) return;
    x.scale(1 / this.cw, 1 / this.rh);
    const p = place(this.W, this.H);
    x.font = `900 100px ${this.fonts.display}`;
    const size = Math.min((p.w / x.measureText(word).width) * 100, p.h);
    x.font = `900 ${size}px ${this.fonts.display}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillStyle = "#fff";
    x.fillText(word, p.x, p.y);
    const data = x.getImageData(0, 0, this.cols, rows).data;
    this.cells.forEach((cell, i) => {
      cell.mt = data[i * 4 + 3] > 100 ? 1 : 0;
      if (instant) cell.m = cell.mt;
    });
  }

  /** Shows a word for `ms`, then restores `back`. Re-flashing the same word extends it. */
  flash(word: string, place: PlaceFn, ms: number, back: { word: string; place: PlaceFn }): void {
    const now = performance.now();
    if (!(this.word === word && this.flashUntil > now)) this.setWord(word, place);
    this.flashUntil = now + ms;
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.setWord(back.word, back.place), ms);
  }

  frame(t: number, f: FieldFrame): void {
    const { ctx, cells, cols, cw, rh } = this;
    if (!ctx || !cells.length) return;

    if (f.motion.rate && t - this.lastTick > TICK_MS) {
      this.lastTick = t;
      const n = Math.max(1, Math.floor(cells.length * f.motion.rate));
      for (let k = 0; k < n; k++) {
        const cell = cells[Math.floor(this.rand() * cells.length)];
        cell.ch = pick(GLYPHS, this.rand);
        cell.s = [...cell.c];
        cell.t = this.baseColour();
        cell.p = 0;
        if (this.rand() < 0.3) cell.h = pick(PALETTE.hi, this.rand);
      }
    }

    if (t - this.lastDraw < DRAW_MS && !f.reduced) return;
    this.lastDraw = t;

    const strength = t < this.flashUntil ? Math.max(f.nameStrength, 0.42) : f.nameStrength;
    const dim = f.motion.dim * f.boost;
    const lights = f.lights.map((l) => ({ ...l, r2: l.r * l.r }));
    const cursor = lights.find((l) => l.cursor);

    ctx.clearRect(0, 0, this.W, this.H);
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (cell.p < 1) {
        cell.p = Math.min(1, cell.p + 0.07);
        for (let j = 0; j < 3; j++) cell.c[j] = lerp(cell.s[j], cell.t[j], cell.p);
      }
      if (cell.m !== cell.mt) {
        cell.m = f.reduced ? cell.mt : cell.m + (cell.mt - cell.m) * cell.sp;
        if (Math.abs(cell.mt - cell.m) < 0.01) cell.m = cell.mt;
      }

      let x = (i % cols) * cw;
      let y = Math.floor(i / cols) * rh;
      let r = Math.min(255, cell.c[0] * dim);
      let g = Math.min(255, cell.c[1] * dim);
      let b = Math.min(255, cell.c[2] * dim);

      const mk = cell.m * strength;
      if (mk > 0.01) {
        r = lerp(r, cell.h[0], mk);
        g = lerp(g, cell.h[1], mk);
        b = lerp(b, cell.h[2], mk);
      }

      for (const l of lights) {
        const dx = x - l.x;
        const dy = y - l.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= l.r2) continue;
        let k = (1 - Math.sqrt(d2) / l.r) * l.k;
        if (cell.m > 0.5 && l.cursor) k = Math.min(0.9, k * 1.5);
        const C = l.color ?? PALETTE.light;
        r = lerp(r, C[0], k);
        g = lerp(g, C[1], k);
        b = lerp(b, C[2], k);
      }

      // Dusk's signature: the glyphs part around the cursor
      if (cursor) {
        const dx = x - cursor.x;
        const dy = y - cursor.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 1) {
          const d = Math.sqrt(d2);
          const push = (1 - d / REPEL_RADIUS) * REPEL_PUSH;
          x += (dx / d) * push;
          y += (dy / d) * push;
        }
      }

      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillText(cell.ch, x, y);
    }
  }

  destroy(): void {
    clearTimeout(this.flashTimer);
  }
}
