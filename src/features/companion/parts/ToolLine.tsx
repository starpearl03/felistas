import type { AnyToolName } from "@/features/agent";

type ToolLineProps = {
  name: AnyToolName;
  input: unknown;
  /** Undefined while the tool is still running */
  ok?: boolean;
};

/** A search query is cut short, so the line stays one line */
const QUERY_CHARS = 32;

/** The short argument shown in the line, e.g. navigate("projects"). Never the visitor's message. */
function argument(name: AnyToolName, input: unknown): string {
  const i = (input ?? {}) as Record<string, unknown>;
  const value =
    name === "navigate"
      ? i.section
      : name === "open_project"
        ? i.id
        : name === "open_role"
          ? i.role
          : name === "set_motion"
            ? i.level
            : name === "draft_message"
              ? i.reply_to
              : name === "search_record" && typeof i.query === "string"
                ? i.query.length > QUERY_CHARS
                  ? `${i.query.slice(0, QUERY_CHARS - 1)}…`
                  : i.query
                : undefined;
  return typeof value === "string" ? `"${value}"` : "";
}

/** Shows each action Dusk takes, so the AI reads as an agent working the page (UI-SPEC §6). */
export function ToolLine({ name, input, ok }: ToolLineProps) {
  const state = ok === undefined ? "running" : ok ? "done" : "skipped";
  return (
    <p className="inline-flex items-center gap-2 self-start font-mono text-[11px] text-muted">
      <span
        aria-hidden
        className="grid size-[18px] place-items-center rounded-full bg-soft text-[10px] text-acc"
      >
        ƒ
      </span>
      <span className="text-fg2">
        {name}({argument(name, input)})
      </span>
      <em className={state === "done" ? "text-acc not-italic" : "text-muted not-italic"}>
        {state}
      </em>
    </p>
  );
}
