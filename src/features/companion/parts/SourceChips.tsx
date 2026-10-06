import type { Source } from "@/features/agent";
import { closeChat, navigate, openProject, openRole } from "@/features/stage";
import type { CompanionConfig } from "../config";
import { isPhone } from "../phone";

/**
 * The passages a live answer cited, e.g. "Projects · Ledgerline". Each opens where it lives through
 * the same commands Dusk's tools use, so a click moves the page exactly as asking would
 * (UI-SPEC §6.1). Sources come from the server's own index, so their ids are real.
 */
export function SourceChips({ sources, config }: { sources: Source[]; config: CompanionConfig }) {
  const open = (s: Source) => {
    // Moving the page folds the phone sheet, as it does for Dusk's tools
    if (isPhone()) closeChat();
    if (s.section === "projects" && s.entityId) {
      openProject(s.entityId, config.projects.find((p) => p.id === s.entityId)?.name);
    } else if (s.section === "experience" && s.entityId) openRole(s.entityId);
    else navigate(s.section);
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
