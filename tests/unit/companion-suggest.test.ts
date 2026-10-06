import { describe, expect, it } from "vitest";
import type { DuskUIMessage } from "@/features/agent";
import type { CompanionConfig } from "@/features/companion";
import { replyFocus, suggestions } from "@/features/companion/suggest";

const config = {
  greetingChips: ["I'm a recruiter", "I'm a developer", "Download resume", "Show projects"],
  resume: { available: true },
  projects: [
    { id: "sentry", name: "SENTRY" },
    { id: "sentinel", name: "Sentinel" },
  ],
  roles: [
    { slug: "melsoft", org: "Melsoft" },
    { slug: "glow", org: "Glow Petroleum" },
  ],
} as unknown as CompanionConfig;

const reply = (parts: DuskUIMessage["parts"], metadata?: DuskUIMessage["metadata"]) =>
  ({ id: "a", role: "assistant", parts, metadata }) as DuskUIMessage;

const tool = (name: string, input: Record<string, unknown>) =>
  ({
    type: `tool-${name}`,
    toolCallId: name,
    state: "output-available",
    input,
    output: { ok: true },
  }) as unknown as DuskUIMessage["parts"][number];

const text = (t: string) => ({ type: "text", text: t }) as DuskUIMessage["parts"][number];

describe("what to ask next", () => {
  it("keeps the offline agent's own chips", () => {
    const m = reply([text("Hi")], { mode: "offline", chips: ["Experience", "Education"] });
    expect(suggestions(m, [], config)).toEqual(["Experience", "Education"]);
  });

  it("follows a project with the next one, the stack and more", () => {
    const m = reply([tool("open_project", { id: "sentry" }), text("SENTRY is…")]);
    expect(replyFocus(m)).toEqual({ section: "projects", id: "sentry" });
    expect(suggestions(m, [], config)).toEqual([
      "Tell me about Sentinel",
      "What stack?",
      "Experience",
      "Download resume",
    ]);
  });

  it("wraps round to the first project after the last", () => {
    const m = reply([tool("open_project", { id: "sentinel" })]);
    expect(suggestions(m, [], config)[0]).toBe("Tell me about SENTRY");
  });

  it("reads the topic of a live answer from its sources", () => {
    const m = reply([text("Melsoft was…")], {
      mode: "live",
      sources: [
        { id: "x", title: "Experience · Melsoft", section: "experience", entityId: "melsoft" },
      ],
    });
    expect(suggestions(m, [], config)).toEqual([
      "Tell me about Glow Petroleum",
      "Education",
      "Show projects",
      "How can I get in touch?",
    ]);
  });

  it("leaves out what the visitor already asked, and the resume when it isn't published", () => {
    const m = reply([tool("navigate", { section: "about" })]);
    const noResume = { ...config, resume: { available: false } } as CompanionConfig;
    expect(suggestions(m, ["show projects"], noResume)).toEqual(["What stack?", "Experience"]);
  });

  it("falls back to the opening suggestions when a reply has no topic", () => {
    expect(suggestions(reply([text("Hello.")]), [], config)).toEqual(config.greetingChips);
    expect(suggestions(undefined, [], config)).toEqual([]);
  });
});
