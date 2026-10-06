"use client";

import type { Role } from "@/features/content";
import { selectRole, useStage } from "@/features/stage";
import { cn } from "@/lib/cn";
import { AskDusk } from "../shared/AskDusk";

export type RoleSummary = Pick<
  Role,
  "slug" | "role" | "org" | "period" | "start" | "end" | "current" | "points"
>;

type YearRulerProps = {
  roles: RoleSummary[];
  /** First year on the ruler */
  from: number;
  /** End of the ruler (exclusive) */
  to: number;
};

/** A ruler of years with one lane per role, placed by its start and end. Selecting a lane fills the detail. */
export function YearRuler({ roles, from, to }: YearRulerProps) {
  const selectedSlug = useStage((s) => s.roleSlug);
  const selected =
    roles.find((r) => r.slug === selectedSlug) ??
    roles.find((r) => r.current) ??
    roles[roles.length - 1];
  const span = to - from;
  const years = Array.from({ length: span }, (_, i) => from + i);
  const pct = (v: number) => `${(v / span) * 100}%`;

  return (
    <>
      <div className="mt-[38px]">
        <div
          aria-hidden
          className="grid border-b border-line pb-2 font-mono text-[11px] text-muted"
          style={{ gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))` }}
        >
          {years.map((y) => (
            <span
              key={y}
              className="relative after:absolute after:-bottom-[9px] after:left-0 after:h-1.5 after:w-px after:bg-line"
            >
              {y}
            </span>
          ))}
        </div>

        <div className="grid gap-2.5 pt-4" role="list" aria-label="Roles">
          {roles.map((r) => {
            const on = r.slug === selected.slug;
            return (
              <div key={r.slug} role="listitem" className="relative h-10">
                <button
                  type="button"
                  aria-pressed={on}
                  aria-controls="role-detail"
                  aria-label={`${r.role} at ${r.org}, ${r.period}`}
                  onClick={() => selectRole(r.slug)}
                  onMouseEnter={() => selectRole(r.slug)}
                  onFocus={() => selectRole(r.slug)}
                  style={{ left: pct(r.start - from), width: pct(r.end - r.start) }}
                  className={cn(
                    "absolute inset-y-0 flex cursor-pointer items-center overflow-hidden rounded-[3px] px-3 text-[13px] whitespace-nowrap transition-[background,color] duration-300",
                    on
                      ? "bg-acc text-ink"
                      : "bg-linear-to-r from-acc/12 to-acc/22 text-fg2 hover:from-acc/18 hover:to-acc/32 hover:text-fg",
                    r.current &&
                      "after:absolute after:inset-y-0 after:right-0 after:w-0.5 after:animate-pulse-soft after:bg-acc2 after:shadow-[0_0_12px_var(--acc2)] motion-reduce:after:animate-none",
                  )}
                >
                  {r.org}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div
        id="role-detail"
        aria-live="polite"
        className="mt-[34px] grid items-start gap-[clamp(20px,4vw,56px)] desk:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
      >
        <div>
          <h3 className="font-serif text-[clamp(34px,3.6vw,54px)] leading-none">{selected.role}</h3>
          <p className="mt-3 font-mono text-xs tracking-[.06em] text-muted">
            <b className="font-normal text-acc">{selected.org}</b> · {selected.period}
            {selected.current ? " · current" : ""}
          </p>
          <div className="mt-[18px]">
            <AskDusk question={`Tell me about ${selected.org}`}>Ask Dusk about this role</AskDusk>
          </div>
        </div>
        <ul className="m-0 grid list-none gap-3.5 p-0">
          {selected.points.map((pt) => (
            <li
              key={pt}
              className="grid grid-cols-[22px_1fr] text-base leading-[1.55] text-fg2 before:mt-[9px] before:size-[7px] before:rotate-45 before:bg-acc"
            >
              {pt}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
