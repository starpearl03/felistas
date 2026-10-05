import type { DuskUIMessage, ToolIds } from "@/features/agent";

/** What the companion needs from content, prepared on the server and passed as props. */
export type CompanionConfig = {
  name: string;
  greeting: string;
  greetingChips: string[];
  resume: {
    available: boolean;
    href: string;
    file: string;
    pages: number;
    size: string;
    updated: string;
  };
  projects: { id: string; name: string }[];
  ids: ToolIds;
};

export const GREETING_ID = "greeting";

export function greetingMessage(config: CompanionConfig): DuskUIMessage {
  return {
    id: GREETING_ID,
    role: "assistant",
    parts: [{ type: "text", text: config.greeting }],
    metadata: { mode: "offline", chips: config.greetingChips },
  };
}
