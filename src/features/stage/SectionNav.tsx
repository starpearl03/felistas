"use client";

import { SECTIONS } from "@/features/content";
import { cn } from "@/lib/cn";
import { navigate } from "./commands";
import { useStage } from "./use-stage";

/** Section links in the top bar. The active one is underlined; shown from 800px, where they fit. */
export function SectionNav() {
  const section = useStage((s) => s.section);

  return (
    <nav aria-label="Sections" className="hidden gap-1 min-[800px]:flex">
      {SECTIONS.slice(1).map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-current={section === id ? "true" : undefined}
          onClick={() => navigate(id)}
          className={cn(
            "relative cursor-pointer px-2.5 py-1.5 text-[13px] transition-colors duration-300",
            "after:absolute after:inset-x-2.5 after:bottom-0.5 after:h-px after:origin-center after:bg-acc after:transition-transform after:duration-300",
            section === id
              ? "text-fg after:scale-x-100"
              : "text-muted after:scale-x-0 hover:text-fg",
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
