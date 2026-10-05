import type { UIDataTypes, UIMessage } from "ai";
import type { SectionId } from "@/features/content";
import type { SearchResult, ToolInputs, ToolName, ToolResult } from "./tools";

/** The offline agent's place in the contact flow, carried in message metadata between turns. */
export type ContactFlow = { step: "email" } | { step: "message"; email: string };

export type DuskMetadata = {
  /** "offline" is the built-in agent; "live" is Gemini (P8) */
  mode?: "offline" | "live";
  /** Suggested replies shown under the message */
  chips?: string[];
  flow?: ContactFlow | null;
  /** The passages a live answer cited, shown as source chips */
  sources?: Source[];
};

/** A cited passage of the record, as the client needs it to show and open it. */
export type Source = {
  id: string;
  /** "Projects · Ledgerline" */
  title: string;
  section: SectionId;
  /** The project id or role slug to open, when the passage belongs to one */
  entityId: string | null;
};

type DuskTools = { [K in ToolName]: { input: ToolInputs[K]; output: ToolResult } } & {
  search_record: { input: { query: string }; output: SearchResult };
};

export type DuskUIMessage = UIMessage<DuskMetadata, UIDataTypes, DuskTools>;

/** What the page tells the server about where the visitor is. */
export type PageContext = {
  section: SectionId;
  projectId: string | null;
  roleSlug: string | null;
};
