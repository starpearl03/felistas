"use client";

import { useEffect } from "react";
import { setMotion } from "./commands";
import { isMotion, MOTION_LEVELS } from "./motion";
import { hydrateMotion } from "./store";
import { useStage } from "./use-stage";

/**
 * The motion level as a quiet drop-down: the current level in mono with a chevron, no box
 * (UI-SPEC §7). A native select, so phones get their own picker and keyboards work as usual.
 */
export function MotionSwitch() {
  const motion = useStage((s) => s.motion);

  useEffect(() => {
    hydrateMotion();
  }, []);

  return (
    <div className="relative flex items-center">
      <select
        aria-label="Motion"
        value={motion}
        onChange={(e) => {
          if (isMotion(e.target.value)) setMotion(e.target.value);
        }}
        className="cursor-pointer appearance-none rounded-md bg-transparent py-[5px] pr-6 pl-2 font-mono text-[10.5px] tracking-[.12em] text-fg uppercase transition-colors hover:bg-soft focus-visible:bg-soft"
      >
        {MOTION_LEVELS.map((level) => (
          <option key={level} value={level} className="bg-bg text-fg normal-case">
            {level[0].toUpperCase() + level.slice(1)}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="pointer-events-none absolute right-1.5 size-3 text-muted"
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </div>
  );
}
