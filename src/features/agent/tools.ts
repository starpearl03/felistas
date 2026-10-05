// The tools Dusk can call, shared by the client (which runs them on the command bus) and the server
// (which declares them to the model in P8). Enums come from content, so ids can't be invented.
import { z } from "zod";
import { SECTION_IDS, type SectionId } from "@/features/content";
import { MOTION_LEVELS, type Motion } from "@/features/stage/motion";

export type ToolIds = {
  projects: readonly [string, ...string[]];
  roles: readonly [string, ...string[]];
};

export function toolInputSchemas(ids: ToolIds) {
  return {
    navigate: z.object({ section: z.enum(SECTION_IDS) }),
    open_project: z.object({ id: z.enum(ids.projects) }),
    open_role: z.object({ role: z.enum(ids.roles) }),
    download_resume: z.object({}),
    draft_message: z.object({
      reply_to: z.email(),
      name: z.string().trim().max(80).optional(),
      message: z.string().trim().min(1).max(2_000),
    }),
    set_motion: z.object({ level: z.enum(MOTION_LEVELS) }),
  };
}

/** What the model is told each tool does (P8). */
export const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  navigate: "Scroll the page to a section.",
  open_project: "Show one project in the Projects section.",
  open_role: "Show one role on the Experience ruler.",
  download_resume: "Show the resume card and start the download.",
  draft_message:
    "Show the visitor a draft message to the portfolio owner. It is never sent automatically: the visitor presses Send.",
  set_motion: "Change how much the page animates: still, calm or lively.",
};

export type ToolName =
  "navigate" | "open_project" | "open_role" | "download_resume" | "draft_message" | "set_motion";

export type ToolInputs = {
  navigate: { section: SectionId };
  open_project: { id: string };
  open_role: { role: string };
  download_resume: Record<string, never>;
  draft_message: { reply_to: string; name?: string; message: string };
  set_motion: { level: Motion };
};

export type ToolCall = {
  [K in ToolName]: { name: K; input: ToolInputs[K] };
}[ToolName];

/** Every client tool reports whether it ran. */
export type ToolResult = { ok: boolean };
