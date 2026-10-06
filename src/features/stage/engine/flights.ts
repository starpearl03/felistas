// Section headings fly out of the sphere letter by letter (UI-SPEC §5.3).
// A heading marked [data-fly] is hidden with `.flying` until its letters land, then fades in.
import { clamp, lerp, smootherstep } from "@/lib/math";
import type { Circle } from "./geometry";
import { GLYPHS, PALETTE, rgba } from "./palette";

export const FLY_MS = 1250;
export const LETTER_DELAY_MS = 20;
/** Over this share of its flight a letter dissolves from a glyph into its real character */
export const SETTLE_FROM = 0.45;
export const SETTLE_TO = 0.85;
/** The canvas letters fade while the real heading fades in over them (CSS, the same time) */
const FADE_OUT_MS = 420;
export const FLYING_CLASS = "flying";

type Letter = {
  range: Range;
  ch: string;
  color: string;
  /** canvas font string with a SIZE placeholder */
  font: string;
  size: number;
  /** launch angle and radius inside the sphere */
  angle: number;
  radius: number;
  delay: number;
};

type Flight = { el: HTMLElement; letters: Letter[]; t0: number };

/** Total duration of a flight with `count` letters, before the fade-out. */
export const flightDuration = (count: number): number =>
  Math.max(0, count - 1) * LETTER_DELAY_MS + FLY_MS;

/** A letter's eased progress at `elapsed` ms, 0 before it launches and 1 once landed. */
export const letterProgress = (elapsed: number, delay: number): number =>
  smootherstep(clamp((elapsed - delay) / FLY_MS));

export class Flights {
  private flights: Flight[] = [];

  constructor(private readonly rand: () => number = Math.random) {}

  get active(): number {
    return this.flights.length;
  }

  /** Hides a heading so it can fly in next time its section is entered. */
  hide(el: HTMLElement): void {
    this.cancel(el);
    el.classList.add(FLYING_CLASS);
  }

  /** Shows a heading immediately, with no flight (Still, or when leaving the page). */
  show(el: HTMLElement): void {
    this.cancel(el);
    el.classList.remove(FLYING_CLASS);
  }

  cancel(el: HTMLElement): void {
    this.flights = this.flights.filter((f) => f.el !== el);
  }

  /** Splits the heading into letters and launches them from inside the sphere. */
  launch(el: HTMLElement, now: number): void {
    this.cancel(el);
    const letters: Letter[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    let index = 0;
    while ((node = walker.nextNode())) {
      const text = node as Text;
      const parent = text.parentElement;
      if (!parent) continue;
      const style = getComputedStyle(parent);
      const font = `${style.fontStyle} ${style.fontWeight} SIZEpx ${style.fontFamily}`;
      for (let i = 0; i < text.data.length; i++) {
        const ch = text.data[i];
        if (!ch.trim()) continue;
        const range = document.createRange();
        range.setStart(text, i);
        range.setEnd(text, i + 1);
        letters.push({
          range,
          ch,
          color: style.color,
          font,
          size: parseFloat(style.fontSize),
          angle: this.rand() * Math.PI * 2,
          radius: this.rand() * 0.6,
          delay: index++ * LETTER_DELAY_MS,
        });
      }
    }
    el.classList.add(FLYING_CLASS);
    this.flights.push({ el, letters, t0: now });
  }

  /**
   * Draws every flight. Letter targets are re-read from live Range rects each frame, so they land
   * exactly even while the page is still scrolling.
   */
  draw(ctx: CanvasRenderingContext2D, t: number, geo: Circle, origin: DOMRect): void {
    if (!this.flights.length) return;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const glyphColour = rgba(PALETTE.hi[2], 1);

    for (let fi = this.flights.length - 1; fi >= 0; fi--) {
      const f = this.flights[fi];
      const elapsed = t - f.t0;
      const end = flightDuration(f.letters.length);
      if (elapsed > end) f.el.classList.remove(FLYING_CLASS);
      const fade = clamp(1 - (elapsed - end) / FADE_OUT_MS);
      if (fade <= 0) {
        this.flights.splice(fi, 1);
        continue;
      }

      f.letters.forEach((l, i) => {
        const raw = clamp((elapsed - l.delay) / FLY_MS);
        if (raw <= 0) return;
        const e = smootherstep(raw);
        const rect = l.range.getBoundingClientRect();
        const tx = rect.left - origin.left + rect.width / 2;
        const ty = rect.top - origin.top + rect.height / 2;
        const sx = geo.x + Math.cos(l.angle) * geo.R * l.radius;
        const sy = geo.y + Math.sin(l.angle) * geo.R * l.radius;
        // a low, even arc
        const mx = lerp(sx, tx, 0.5);
        const my = Math.min(sy, ty) - 46 - l.radius * 44;
        const u = 1 - e;
        const x = u * u * sx + 2 * u * e * mx + e * e * tx;
        const y = u * u * sy + 2 * u * e * my + e * e * ty;
        const size = lerp(Math.max(9, geo.R * 0.11), l.size, e);
        ctx.font = l.font.replace("SIZE", size.toFixed(1));
        // the glyph dissolves into the real letter instead of switching
        const settle = smootherstep(clamp((raw - SETTLE_FROM) / (SETTLE_TO - SETTLE_FROM)));
        const appear = clamp(raw / 0.12);
        if (settle < 1) {
          ctx.globalAlpha = fade * appear * (1 - settle) * (0.6 + e * 0.4);
          ctx.fillStyle = glyphColour;
          ctx.fillText(GLYPHS[(i * 7 + Math.floor(l.delay / 60)) % GLYPHS.length], x, y);
        }
        if (settle > 0) {
          ctx.globalAlpha = fade * settle;
          ctx.fillStyle = l.color;
          ctx.fillText(l.ch, x, y);
        }
      });
      ctx.globalAlpha = 1;
    }
  }
}
