"use client";

import { Fragment } from "react";
import { flashWord } from "@/features/stage";

/** The daily stack on one wrapping line. Hovering a skill spells it in the glyph field (UI-SPEC §4). */
export function SkillLine({ skills }: { skills: string[] }) {
  return (
    <p className="mt-[30px] font-mono text-[13px] leading-[2.1] text-muted">
      Daily stack <span className="text-acc/35"> · </span>
      {skills.map((s, i) => (
        <Fragment key={s}>
          {/* real spaces give the line places to wrap on narrow screens */}
          {i > 0 ? <span className="text-acc/35"> / </span> : null}
          <span
            onMouseEnter={() => flashWord(s, 2200)}
            className="whitespace-nowrap text-fg2 transition-colors hover:text-acc"
          >
            {s}
          </span>
        </Fragment>
      ))}
    </p>
  );
}
