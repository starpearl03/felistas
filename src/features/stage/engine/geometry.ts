// Stage layout maths (UI-SPEC §4, §5.1). Pure functions of the viewport, so they are unit-tested.
import { clamp, lerp, smoothstep } from "@/lib/math";

/** Below this width phones get the chat-first view. Mirrors the `desk` breakpoint in CSS. */
export const DESK_MIN_WIDTH = 600;
/** From this width the column reaches its full size. Mirrors the `wide` breakpoint in CSS. */
export const WIDE_MIN_WIDTH = 900;

export type Circle = { x: number; y: number; R: number };

/** A box that a word is fitted into, centred on (x, y). */
export type Placement = { x: number; y: number; w: number; h: number };

/** Mirrors `--col` in globals.css: narrower on tablets, zero on phones. */
export function columnWidth(W: number): number {
  if (W < DESK_MIN_WIDTH) return 0;
  return W < WIDE_MIN_WIDTH ? clamp(W * 0.34, 230, 340) : clamp(W * 0.3, 340, 440);
}

/** The large sphere on the first screen. */
export function heroSphere(W: number, H: number): Circle {
  const col = columnWidth(W);
  if (!col) return { x: W / 2, y: H * 0.2, R: Math.min(W * 0.27, H * 0.13) };
  return { x: col / 2, y: H * 0.33, R: Math.min(col * 0.42, H * 0.29) };
}

/**
 * The sphere docked at the top of the column. It stays large. On phones it fills the companion's slot:
 * a small mark on the folded bar, a large orb while the chat fills the screen.
 */
export function dockedSphere(
  W: number,
  H: number,
  slot?: { x: number; y: number; r?: number },
): Circle {
  const col = columnWidth(W);
  if (!col) return { x: slot?.x ?? W / 2, y: slot?.y ?? H * 0.2, R: slot?.r ?? 17 };
  const R = Math.min(col * 0.3, H * 0.17);
  return { x: col / 2, y: 64 + R, R };
}

export function sphereAt(hero: Circle, dock: Circle, k: number): Circle {
  return { x: lerp(hero.x, dock.x, k), y: lerp(hero.y, dock.y, k), R: lerp(hero.R, dock.R, k) };
}

/**
 * Top padding of the companion column: the conversation sits under the sphere and rises with it,
 * so it grows taller once the sphere has docked (UI-SPEC §5.1).
 */
export function columnLift(hero: Circle, dock: Circle, H: number, k: number): number {
  return Math.round(lerp(hero.y + hero.R + H * 0.06, dock.y + dock.R + 34, k));
}

/** 0 on the intro, 1 once the visitor has scrolled 60% of a screen, eased. */
export function introProgress(scrollTop: number, viewportHeight: number): number {
  if (viewportHeight <= 0) return 0;
  return smoothstep(clamp(scrollTop / (viewportHeight * 0.6)));
}

/** Where the sphere docks on phones: the slot in the companion sheet header (UI-SPEC §9). */
export function sheetSlot(W: number, H: number): { x: number; y: number } {
  return { x: Math.min(36, W / 2), y: H - 124 };
}

/**
 * The current section: the last one whose top is at or above 45% of the viewport (UI-SPEC §5.4).
 * Computed from scroll position every frame, so it never depends on IntersectionObserver.
 */
export function detectSection<T extends string>(
  sections: readonly { id: T; top: number }[],
  scrollTop: number,
  viewportHeight: number,
): T | null {
  const line = scrollTop + viewportHeight * 0.45;
  let current: T | null = sections[0]?.id ?? null;
  for (const s of sections) if (s.top <= line) current = s.id;
  return current;
}

/** Where the name FELISTAS is spelled in glyphs. */
export function namePlacement(W: number, H: number): Placement {
  const col = columnWidth(W);
  if (!col) return { x: W / 2, y: H * 0.42, w: W * 0.92, h: H * 0.13 };
  return { x: col + (W - col) / 2, y: H * 0.4, w: (W - col) * 0.9, h: H * 0.42 };
}

/** Where hovered project names and skills flash. */
export function flashPlacement(W: number, H: number): Placement {
  const col = columnWidth(W);
  if (!col) return { x: W / 2, y: H * 0.3, w: W * 0.9, h: H * 0.12 };
  return { x: col + (W - col) * 0.62, y: H * 0.62, w: (W - col) * 0.62, h: H * 0.26 };
}
