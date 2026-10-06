import type { DuskUIMessage, ToolIds } from "@/features/agent";
import type { Education, Profile, Project, Role } from "@/features/content";

/** What the companion needs from content, prepared on the server and passed as props. */
export type CompanionConfig = {
  name: string;
  greeting: string;
  greetingChips: string[];
  resume: {
    available: boolean;
    href: string;
    file: string;
    /** Read from the source; absent when it couldn't be */
    size?: string;
    updated?: string;
  };
  projects: Pick<
    Project,
    "id" | "name" | "kind" | "year" | "status" | "desc" | "stack" | "metric" | "metricLabel" | "url"
  >[];
  /** For the replies Dusk shows inline in the phone chat (UI-SPEC §9.1) */
  roles: Pick<Role, "slug" | "role" | "org" | "period" | "current" | "points">[];
  education: Pick<Education, "slug" | "year" | "title" | "org">[];
  about: { line: string; facts: Profile["facts"] };
  contact: { email: string; links: Profile["links"] };
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
