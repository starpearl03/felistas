import type { UIDataTypes, UIMessage } from "ai";
import type { SectionId } from "@/features/content";
import type { ToolInputs, ToolName, ToolResult } from "./tools";

/** The offline agent's place in the contact flow, carried in message metadata between turns. */
export type ContactFlow = { step: "email" } | { step: "message"; email: string };

export type DuskMetadata = {
  /** "offline" is the built-in agent; "live" is Gemini (P8) */
  mode?: "offline" | "live";
  /** Suggested replies shown under the message */
  chips?: string[];
  flow?: ContactFlow | null;
};

type DuskTools = { [K in ToolName]: { input: ToolInputs[K]; output: ToolResult } };

export type DuskUIMessage = UIMessage<DuskMetadata, UIDataTypes, DuskTools>;

/** What the page tells the server about where the visitor is. */
export type PageContext = {
  section: SectionId;
  projectId: string | null;
  roleSlug: string | null;
};
