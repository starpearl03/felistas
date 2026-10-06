// What to ask next. The offline agent picks its own chips; a live answer has none, so the next steps
// come from what the reply was about. Every step offers somewhere to go (UI-SPEC §9.1). Pure.
import type { DuskUIMessage } from "@/features/agent";
import type { SectionId } from "@/features/content";
import type { CompanionConfig } from "./config";

const MAX = 4;
const TOOL_PREFIX = "tool-";

type Focus = { section: SectionId; id?: string } | null;

/** The section a reply was about, and the project or role in it: from its tools, else its sources. */
export function replyFocus(message: DuskUIMessage): Focus {
  for (const part of message.parts) {
    if (!part.type.startsWith(TOOL_PREFIX) || !("input" in part)) continue;
    const input = (part.input ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    switch (part.type.slice(TOOL_PREFIX.length)) {
      case "open_project":
        return { section: "projects", id: str(input.id) };
      case "open_role":
        return { section: "experience", id: str(input.role) };
      case "navigate":
        return input.section ? { section: input.section as SectionId } : null;
      case "draft_message":
      case "download_resume":
        return { section: "contact" };
    }
  }
  const source = message.metadata?.sources?.[0];
  return source ? { section: source.section, id: source.entityId ?? undefined } : null;
}

/** The next item after `id` in a list, wrapping round; the first when `id` isn't in it. */
const after = <T>(items: T[], key: (t: T) => string, id?: string): T | undefined =>
  items[(items.findIndex((t) => key(t) === id) + 1) % Math.max(1, items.length)];

/**
 * Up to four next questions for `message`: its own chips when it has them, otherwise ones that follow
 * from its topic. Questions the visitor already asked are left out.
 */
export function suggestions(
  message: DuskUIMessage | undefined,
  asked: readonly string[],
  config: CompanionConfig,
): string[] {
  if (!message) return [];
  const own = message.metadata?.chips;
  if (own?.length) return own.slice(0, MAX);

  const resume = config.resume.available ? "Download resume" : null;
  const focus = replyFocus(message);
  const nextProject = after(config.projects, (p) => p.id, focus?.id);
  const nextRole = after(config.roles, (r) => r.slug, focus?.id);
  const byTopic: Record<SectionId, (string | null | undefined)[]> = {
    home: config.greetingChips,
    about: ["Show projects", "What stack?", "Experience", resume],
    projects: [
      nextProject && `Tell me about ${nextProject.name}`,
      "What stack?",
      "Experience",
      resume,
    ],
    experience: [
      config.roles.length > 1 && nextRole ? `Tell me about ${nextRole.org}` : null,
      "Education",
      "Show projects",
      "How can I get in touch?",
    ],
    education: ["Experience", "Show projects", resume],
    contact: ["Show projects", resume, "Experience"],
  };

  const seen = new Set(asked.map((a) => a.trim().toLowerCase()));
  const picked: string[] = [];
  for (const s of byTopic[focus?.section ?? "home"]) {
    if (!s || seen.has(s.toLowerCase()) || picked.includes(s)) continue;
    picked.push(s);
    if (picked.length === MAX) break;
  }
  return picked;
}
