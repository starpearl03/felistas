export type Surface = { ctx: CanvasRenderingContext2D; w: number; h: number };

/** Sizes a canvas to its CSS box at up to 2× device pixels and returns a context in CSS pixels. */
export function fitCanvas(canvas: HTMLCanvasElement, maxDpr = 2): Surface | null {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

export type FontFamilies = { mono: string; display: string };

/** next/font renames families, so the canvas reads the real names from the CSS variables. */
export function readFontFamilies(root: HTMLElement = document.documentElement): FontFamilies {
  const style = getComputedStyle(root);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    mono: read("--ff-mono", "ui-monospace, monospace"),
    display: read("--ff-display", "Impact, 'Arial Narrow', sans-serif"),
  };
}

/** Loads the faces the canvas draws with. The display face is used by no DOM text, so it must be requested. */
export async function loadCanvasFonts(families: FontFamilies): Promise<void> {
  if (!("fonts" in document)) return;
  await Promise.allSettled([
    document.fonts.load(`900 100px ${families.display}`),
    document.fonts.load(`14px ${families.mono}`),
  ]);
  await document.fonts.ready;
}
