import type { Source } from "@/features/agent";
import type { CompanionConfig } from "../config";
import { runTool } from "../run-tool";

/**
 * The passages a live answer cited, e.g. "Projects · Ledgerline". Each opens where it lives, through
 * the same tools Dusk uses, so a click moves the page exactly as asking would (UI-SPEC §6.1).
 */
export function SourceChips({ sources, config }: { sources: Source[]; config: CompanionConfig }) {
  const open = (s: Source) => {
    if (s.section === "projects" && s.entityId) runTool("open_project", { id: s.entityId }, config);
    else if (s.section === "experience" && s.entityId) {
      runTool("open_role", { role: s.entityId }, config);
    } else runTool("navigate", { section: s.section }, config);
  };

  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[10.5px] tracking-[.04em] text-muted">
      <span>Sources</span>
      {sources.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => open(s)}
          className="cursor-pointer text-fg2 underline decoration-current/35 underline-offset-[3px] transition-colors hover:text-fg hover:decoration-current"
        >
          {s.title} ↗
        </button>
      ))}
    </p>
  );
}
