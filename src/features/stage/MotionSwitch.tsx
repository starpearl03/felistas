"use client";

import { useEffect } from "react";
import { setMotion } from "./commands";
import { MOTION_LEVELS } from "./motion";
import { hydrateMotion } from "./store";
import { useStage } from "./use-stage";

export function MotionSwitch() {
  const motion = useStage((s) => s.motion);

  useEffect(() => {
    hydrateMotion();
  }, []);

  return (
    <div
      role="group"
      aria-label="Motion"
      className="flex gap-0.5 font-mono text-[10.5px] tracking-[.1em] uppercase"
    >
      <span aria-hidden className="hidden py-[5px] pr-1 pl-2.5 text-muted desk:inline">
        Motion
      </span>
      {MOTION_LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          aria-pressed={motion === level}
          onClick={() => setMotion(level)}
          className="cursor-pointer rounded-md px-2 py-[5px] text-muted uppercase transition-colors hover:text-fg aria-pressed:bg-soft aria-pressed:text-fg"
        >
          {level}
        </button>
      ))}
    </div>
  );
}
