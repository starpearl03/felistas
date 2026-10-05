import { beforeAll, describe, expect, it } from "vitest";
import {
  type AgentRecord,
  buildRecord,
  type ContactFlow,
  greeting,
  greetingChips,
  respondOffline,
} from "@/features/agent";
import { CONTENT_DIR, loadSiteFrom } from "@/features/content/server";

let rec: AgentRecord;

beforeAll(async () => {
  rec = buildRecord(await loadSiteFrom(CONTENT_DIR));
});

const ask = (text: string, flow: ContactFlow | null = null) => respondOffline(text, flow, rec);
const toolNames = (text: string) => ask(text).tools.map((t) => t.name);

describe("greeting", () => {
  it("introduces Dusk and the record from content", () => {
    expect(greeting(rec)).toContain(`record of ${rec.name}`);
  });

  it("offers the resume only when it is published", () => {
    expect(greetingChips({ resumeAvailable: true })).toContain("Download resume");
    expect(greetingChips({ resumeAvailable: false })).not.toContain("Download resume");
  });
});

describe("visitor intents", () => {
  it("gives recruiters the short version and opens experience", () => {
    const r = ask("I'm a recruiter");
    expect(r.tools).toEqual([{ name: "navigate", input: { section: "experience" } }]);
    expect(r.text).toContain(rec.roles.find((x) => x.current)!.org);
  });

  it("shows developers the projects", () => {
    expect(ask("I'm a developer").tools).toEqual([
      { name: "navigate", input: { section: "projects" } },
    ]);
  });

  it("opens a project by name", () => {
    const r = ask("Tell me about Atlas");
    expect(r.tools).toEqual([{ name: "open_project", input: { id: "atlas" } }]);
    expect(r.text).toContain("Atlas is semantic search");
    expect(r.chips).not.toContain("Tell me about Atlas");
  });

  it("opens a role by company", () => {
    expect(ask("what did they do at Kestrel?").tools).toEqual([
      { name: "open_role", input: { role: "kestrel-systems" } },
    ]);
  });

  it("answers a skill with the projects that use it", () => {
    const r = ask("do they know Kafka?");
    expect(r.text).toContain("Ledgerline");
    expect(r.tools[0]).toEqual({ name: "navigate", input: { section: "about" } });
  });

  it("covers stack, experience, education and about", () => {
    expect(toolNames("what's the stack")).toEqual(["navigate"]);
    expect(ask("where have they worked").tools[0]).toEqual({
      name: "navigate",
      input: { section: "experience" },
    });
    expect(ask("what degree").tools[0]).toEqual({
      name: "navigate",
      input: { section: "education" },
    });
    expect(ask("who is felistas").tools[0]).toEqual({
      name: "navigate",
      input: { section: "about" },
    });
  });

  it("hands over the resume when it exists, and says so when it doesn't", () => {
    expect(toolNames("download resume")).toEqual(["download_resume"]);
    const none = respondOffline("cv please", null, { ...rec, resumeAvailable: false });
    expect(none.tools).toEqual([]);
    expect(none.text).toContain(rec.email);
  });

  it("changes the motion level on request", () => {
    expect(ask("turn off the animation").tools).toEqual([
      { name: "set_motion", input: { level: "still" } },
    ]);
    expect(ask("calm motion please").tools[0]).toEqual({
      name: "set_motion",
      input: { level: "calm" },
    });
  });

  it("answers from the FAQ", () => {
    expect(ask("are they willing to relocate?").text).toContain("relocation");
  });

  it("keeps common words from matching skills and roles", () => {
    // "go" is not the Go language, and "freelance work" is about availability
    expect(ask("Where did Felistas go to university?").tools[0]).toEqual({
      name: "navigate",
      input: { section: "education" },
    });
    const freelance = ask("Is Felistas open to freelance work?");
    expect(freelance.tools.map((t) => t.name)).not.toContain("open_role");
    expect(freelance.text).toMatch(/open to/i);
    expect(ask("Do they write Go?").text).toContain("Go is part of");
  });

  it("redirects unknown questions without inventing anything", () => {
    const r = ask("what is their favourite colour?");
    expect(r.tools).toEqual([]);
    expect(r.text).toMatch(/isn't in the record/);
  });
});

describe("the contact flow", () => {
  it("asks for an email, then a message, then shows a draft and never sends", () => {
    const start = ask("I want to contact Felistas");
    expect(start.flow).toEqual({ step: "email" });
    expect(start.tools).toEqual([{ name: "navigate", input: { section: "contact" } }]);

    const bad = ask("my email is nope", start.flow);
    expect(bad.flow).toEqual({ step: "email" });
    expect(bad.text).toMatch(/doesn't look like an email/);

    const punctuated = ask("it's jane@acme.com.", start.flow);
    expect(punctuated.flow).toEqual({ step: "message", email: "jane@acme.com" });

    const email = ask("sure, ada@acme.com", start.flow);
    expect(email.flow).toEqual({ step: "message", email: "ada@acme.com" });

    const message = ask("Let's talk about a senior role.", email.flow);
    expect(message.flow).toBeNull();
    expect(message.tools).toEqual([
      {
        name: "draft_message",
        input: { reply_to: "ada@acme.com", message: "Let's talk about a senior role." },
      },
    ]);
  });

  it("can be cancelled at every step", () => {
    for (const flow of [
      { step: "email" },
      { step: "message", email: "a@b.co" },
    ] satisfies ContactFlow[]) {
      const r = ask("cancel", flow);
      expect(r.flow).toBeNull();
      expect(r.tools).toEqual([]);
      expect(r.text).toMatch(/Nothing was sent/);
    }
  });
});
