import type { ToolName } from "@/features/agent";

type ToolLineProps = {
  name: ToolName;
  input: unknown;
  /** Undefined while the tool is still running */
  ok?: boolean;
};

/** The short argument shown in the line, e.g. navigate("projects"). Never the visitor's message. */
function argument(name: ToolName, input: unknown): string {
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
