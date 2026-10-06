"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { setMotion } from "./commands";
import { type Motion, MOTION_LEVELS } from "./motion";
import { hydrateMotion } from "./store";
import { useStage } from "./use-stage";

const NOTE: Record<Motion, string> = {
  still: "Nothing moves",
  calm: "Gentle, slower",
  lively: "The full effect",
};

/**
 * The motion level as a quiet drop-down in Dusk's style (UI-SPEC §7): the current level in mono with
 * a chevron, opening a dim glass menu. A select-only combobox (WAI-ARIA): focus stays on the trigger,
 * arrows move, Enter or Space picks, Escape or Tab closes.
 */
export function MotionSwitch() {
  const motion = useStage((s) => s.motion);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;

  useEffect(() => {
    hydrateMotion();
  }, []);

  // A tap or click anywhere else closes it
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const show = () => {
    setActive(MOTION_LEVELS.indexOf(motion));
    setOpen(true);
  };
  const pick = (level: Motion) => {
    setMotion(level);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = MOTION_LEVELS.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    };
    if (e.key in moves) {
      e.preventDefault();
      setActive(moves[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(MOTION_LEVELS[active]);
    } else if (e.key === "Escape") {
      // only the menu closes, not the phone chat behind it
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        role="combobox"
        aria-label="Motion"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-md py-[5px] pr-1.5 pl-2 font-mono text-[10.5px] tracking-[.12em] uppercase transition-colors hover:bg-soft",
          open ? "bg-soft text-fg" : "text-fg",
        )}
      >
        {motion}
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={cn(
            "size-3 text-muted transition-transform duration-300",
            open && "rotate-180 text-acc",
          )}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      <ul
        id={listId}
        role="listbox"
        aria-label="Motion"
        hidden={!open}
        className="absolute top-[calc(100%+8px)] right-0 z-10 m-0 grid w-[188px] origin-top-right list-none gap-0.5 rounded-lg border border-line bg-bg/90 p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,.7)] backdrop-blur-md motion-safe:animate-[menu-in_.18s_ease-out]"
      >
        {MOTION_LEVELS.map((level, i) => {
          const selected = level === motion;
          return (
            <li
              key={level}
              id={optionId(i)}
              role="option"
              aria-selected={selected}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(level)}
              className={cn(
                "grid cursor-pointer grid-cols-[10px_1fr] items-baseline gap-x-2 rounded-md px-2.5 py-2 transition-colors",
                i === active && "bg-soft",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 self-center rounded-full",
                  selected ? "bg-acc shadow-[0_0_8px_var(--acc)]" : "bg-transparent",
                )}
              />
              <span className="grid">
                <span
                  className={cn(
                    "font-mono text-[10.5px] tracking-[.12em] uppercase",
                    selected ? "text-acc" : "text-fg",
                  )}
                >
                  {level}
                </span>
                <span className="font-serif text-[14px] leading-tight text-muted">
                  {NOTE[level]}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
