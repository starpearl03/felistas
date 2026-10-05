"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { createStageEngine } from "./engine/stage-engine";
import { hydrateMotion } from "./store";

type StageProps = {
  /** The word spelled in glyphs on the intro */
  word: string;
  children: ReactNode;
};

/**
 * The full-viewport stage, back to front: the glyph field, a veil that dims it once the visitor
 * leaves the intro, the page content and companion, and the sphere on top.
 * The engine sets `data-motion`, `data-section` and `data-shape` on the root.
 */
export function Stage({ word, children }: StageProps) {
  const root = useRef<HTMLDivElement>(null);
  const glyphs = useRef<HTMLCanvasElement>(null);
  const sphere = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!root.current || !glyphs.current || !sphere.current) return;
    hydrateMotion();
    const engine = createStageEngine({
      root: root.current,
      glyphCanvas: glyphs.current,
      sphereCanvas: sphere.current,
      word,
    });
    return () => engine.destroy();
  }, [word]);

  return (
    <div ref={root} data-stage className="fixed inset-0 overflow-hidden bg-bg">
      <canvas ref={glyphs} data-layer="glyphs" aria-hidden className="absolute inset-0 size-full" />
      <div data-veil aria-hidden className="pointer-events-none absolute inset-0 bg-bg opacity-0" />
      {children}
      <canvas
        ref={sphere}
        data-layer="sphere"
        aria-hidden
        className="pointer-events-none absolute inset-0 z-6 size-full"
      />
    </div>
  );
}
