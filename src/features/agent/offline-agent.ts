// The built-in agent: answers from the record with simple matching when no AI key is set, or when the
// model is unavailable. Port of `makeAgent` in docs/ui/Felistas Dusk.html, driven by content.
// Pure (no I/O), so every flow is unit-tested.
import { z } from "zod";
import { queryGroups, tokenize } from "./rag/tokenize";
import type { Chunk } from "./rag/types";
import type { AgentRecord } from "./record";
import type { ToolCall } from "./tools";
import type { ContactFlow } from "./types";

export type AgentReply = {
  text: string;
  tools: ToolCall[];
  chips?: string[];
  /** The contact flow after this reply; null ends it */
  flow: ContactFlow | null;
};

/** Suggestions under the greeting; the resume one only when the file is published. */
export function greetingChips(rec: Pick<AgentRecord, "resumeAvailable">): string[] {
  return [
    "I'm a recruiter",
    "I'm a developer",
    rec.resumeAvailable ? "Download resume" : null,
    "Show projects",
  ].filter((c): c is string => c !== null);
}

// Stops before trailing punctuation: "jane@acme.com." captures "jane@acme.com"
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
const isEmail = (value: string) => z.email().safeParse(value).success;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordIn = (text: string, word: string) =>
  new RegExp(`(^|[^a-z0-9])${escapeRe(word.toLowerCase())}($|[^a-z0-9])`).test(text);
const list = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

export function greeting(rec: AgentRecord): string {
  return `Hello. I'm Dusk, and I keep the record of ${rec.name}, a ${rec.role.toLowerCase()}. Who's visiting today?`;
}

/** Finds the passage of the record that best answers a question, or null when nothing does. */
export type Lookup = (question: string) => Chunk | null;

/**
 * Answers one visitor message. `flow` is where the contact flow stood after the last reply; `lookup`
 * searches the record when no simple rule matches.
 */
export function respondOffline(
  input: string,
  flow: ContactFlow | null,
  rec: AgentRecord,
  lookup?: Lookup,
): AgentReply {
  const raw = input.trim();
  const q = raw.toLowerCase();
  const chips = (extra: string[] = []) => [...extra, ...defaultChips(rec)].slice(0, 4);
  const reply = (text: string, extra: Partial<AgentReply> = {}): AgentReply => ({
    text,
    tools: [],
    flow: null,
    ...extra,
  });

  // ---- the contact flow: email → message → draft card ----
  if (flow && /^(cancel|stop|never ?mind|abort|no thanks)\b/.test(q)) {
    return reply("Cancelled. Nothing was sent.", { chips: chips() });
  }
  if (flow?.step === "email") {
    const email = raw.match(EMAIL)?.[0];
    if (!email || !isEmail(email)) {
      return reply(
        "That doesn't look like an email address. Try something like name@company.com, or say cancel.",
        { flow },
      );
    }
    return reply(`Thank you. What would you like to say to ${rec.name}?`, {
      flow: { step: "message", email },
    });
  }
  if (flow?.step === "message") {
    return reply("Here is your message. Read it over, then press Send when you're ready.", {
      tools: [{ name: "draft_message", input: { reply_to: flow.email, message: raw } }],
    });
  }

  // ---- direct requests ----
  if (/\b(resume|cv|download)\b/.test(q)) {
    if (!rec.resumeAvailable) {
      return reply(
        `The resume isn't published yet. You can email ${rec.name} at ${rec.email} in the meantime.`,
        { chips: chips([contactChip(rec)]) },
      );
    }
    return reply(`Here is ${rec.name}'s resume.`, {
      tools: [{ name: "download_resume", input: {} }],
      chips: [contactChip(rec), "Show projects"],
    });
  }

  const motion = motionRequest(q);
  if (motion) {
    return reply(
      motion === "still" ? "Done. The page is still now." : `Done. Motion is set to ${motion}.`,
      { tools: [{ name: "set_motion", input: { level: motion } }], chips: chips() },
    );
  }

  if (/\b(contact|email|reach|message|hire|talk to|get in touch|send)\b/.test(q)) {
    return reply(
      `I can carry a message to ${rec.name}. Which email address should the reply go to?`,
      {
        tools: [{ name: "navigate", input: { section: "contact" } }],
        flow: { step: "email" },
      },
    );
  }

  const current = rec.roles.find((r) => r.current);
  if (/\b(recruit\w*|hiring|role|position|vacanc\w*)\b/.test(q)) {
    return reply(
      `Here's the short version. ${rec.line}${current ? ` Right now: ${current.role} at ${current.org}.` : ""} ${rec.availability}.`,
      {
        tools: [{ name: "navigate", input: { section: "experience" } }],
        chips: ["Download resume", contactChip(rec)],
      },
    );
  }

  const project = rec.projects.find((p) => wordIn(q, p.id) || wordIn(q, p.name));
  if (project) {
    const state = project.status === "LIVE" ? "in production since" : "in progress since";
    return reply(
      `${project.name} is ${project.kind.toLowerCase()}, ${state} ${project.year}. ${project.desc} Built with ${list(project.stack)}.`,
      {
        tools: [{ name: "open_project", input: { id: project.id } }],
        chips: rec.projects
          .filter((p) => p !== project)
          .slice(0, 2)
          .map((p) => `Tell me about ${p.name}`)
          .concat("Download resume"),
      },
    );
  }

  if (/\b(educat\w*|degree|stud\w*|universit\w*|school|certif\w*)\b/.test(q)) {
    return reply(`${list(rec.education.map((e) => `${e.title} (${e.org}, ${e.year})`))}.`, {
      tools: [{ name: "navigate", input: { section: "education" } }],
      chips: ["Experience", contactChip(rec)],
    });
  }

  // Availability and the FAQ come before roles and skills, so "open to freelance work?" is about
  // availability, not the Freelance role
  const faq = rec.faq.find((f) => overlap(q, f.question) >= 2);
  if (faq) return reply(faq.answer, { chips: chips() });
  if (/\b(availab\w*|open to|relocat\w*|remote|notice period)\b/.test(q)) {
    return reply(`${rec.availability}.`, { chips: chips() });
  }

  const role = rec.roles.find(
    (r) =>
      wordIn(q, r.org) ||
      (r.org.includes(" ") && r.org.split(" ")[0].length > 3 && wordIn(q, r.org.split(" ")[0])),
  );
  if (role) {
    return reply(`${role.role} at ${role.org}, ${role.period}. ${role.points.join(". ")}.`, {
      tools: [{ name: "open_role", input: { role: role.slug } }],
      chips: ["Download resume", "Show projects"],
    });
  }

  // Short skill names ("Go", "R") are common words, so they only match as written
  const skill =
    rec.skills.find((s) => (s.length <= 2 ? raw.includes(s) && wordIn(q, s) : wordIn(q, s))) ??
    (/\bgolang\b/.test(q) ? "Go" : undefined);
  if (skill) {
    const used = rec.projects.filter((p) => p.stack.includes(skill)).map((p) => p.name);
    return reply(
      `${skill} is part of ${rec.name}'s daily stack.${used.length ? ` It powers ${list(used)}.` : ""}`,
      {
        tools: [{ name: "navigate", input: { section: "about" } }],
        chips: ["Show projects", "What stack?"],
      },
    );
  }

  if (/\b(developer|i'?m a dev|projects?|work|built|portfolio|ship\w*)\b/.test(q)) {
    const lead = rec.projects[0];
    return reply(
      `${rec.projects.length} projects on record.${lead ? ` The first is ${lead.name}: ${lead.desc}` : ""}`,
      {
        tools: [{ name: "navigate", input: { section: "projects" } }],
        chips: rec.projects
          .slice(1, 3)
          .map((p) => `Tell me about ${p.name}`)
          .concat("What stack?"),
      },
    );
  }

  if (/\b(stack|tech\w*|skills?|languages?|tools|frameworks?)\b/.test(q)) {
    return reply(`The daily stack: ${list(rec.skills.slice(0, 8))}.`, {
      tools: [{ name: "navigate", input: { section: "about" } }],
      chips: ["Show projects", "Download resume"],
    });
  }

  if (/\b(experience|jobs?|career|worked|compan\w*|employ\w*)\b/.test(q)) {
    const earlier = rec.roles.filter((r) => !r.current).map((r) => r.org);
    return reply(
      `${current ? `Currently ${current.role} at ${current.org}.` : ""}${earlier.length ? ` Before that: ${list(earlier.reverse())}.` : ""}`.trim(),
      {
        tools: [{ name: "navigate", input: { section: "experience" } }],
        chips: ["Education", "Download resume"],
      },
    );
  }

  if (/\b(about|who|yourself|bio)\b/.test(q) || q === rec.name.toLowerCase()) {
    return reply(rec.about[0] ?? rec.line, {
      tools: [{ name: "navigate", input: { section: "about" } }],
      chips: ["What stack?", "Show projects"],
    });
  }

  if (/\b(curious|looking|browsing|just)\b/.test(q)) {
    return reply(
      "Take your time. The projects are a good place to begin, and I am here when a question comes.",
      { tools: [{ name: "navigate", input: { section: "projects" } }], chips: chips() },
    );
  }

  if (/^(hi|hey|hello|yo|good (morning|afternoon|evening))\b/.test(q)) {
    return reply(`Hello. Ask me about ${rec.name}, or choose one of these.`, { chips: chips() });
  }

  if (/\b(help|what can you|commands|options)\b/.test(q)) {
    return reply(
      `I can walk you through the projects, experience and education, hand you the resume, or take a message for ${rec.name}.`,
      { chips: chips() },
    );
  }

  if (/\b(home|top|start|begin|intro)\b/.test(q)) {
    return reply("Back to the beginning.", {
      tools: [{ name: "navigate", input: { section: "home" } }],
      chips: chips(),
    });
  }

  const found = lookup?.(raw);
  if (found) {
    return reply(`From the record, ${found.title}: ${quote(found, raw)}`, {
      tools: sourceTools(found),
      chips: chips(),
    });
  }

  return reply(
    `That isn't in the record I keep. I can show projects, experience or education, hand you the resume, or send ${rec.name} a message.`,
    { chips: chips() },
  );
}

/**
 * The two sentences of a passage that share the most words with the question, in their original
 * order (the opening ones on a tie). An FAQ passage is quoted without its question.
 */
function quote(chunk: Chunk, question: string): string {
  const text = chunk.kind === "faq" ? chunk.text.replace(/^[^?]*\?\s*/, "") : chunk.text;
  const sentences = (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [text]).map((t) =>
    t.trim(),
  );
  const terms = queryGroups(question);
  const score = (sentence: string) => {
    const words = new Set(tokenize(sentence));
    return terms.filter((group) => group.some((t) => words.has(t))).length;
  };
  return sentences
    .map((t, i) => ({ t, i, score: score(t) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, 2)
    .sort((a, b) => a.i - b.i)
    .map((s) => s.t)
    .join(" ");
}

/** Shows the visitor where the passage lives on the page. */
function sourceTools(chunk: Chunk): ToolCall[] {
  if (chunk.section === "projects" && chunk.entityId) {
    return [{ name: "open_project", input: { id: chunk.entityId } }];
  }
  if (chunk.section === "experience" && chunk.entityId) {
    return [{ name: "open_role", input: { role: chunk.entityId } }];
  }
  return chunk.section === "home" ? [] : [{ name: "navigate", input: { section: chunk.section } }];
}

function defaultChips(rec: AgentRecord): string[] {
  return [
    rec.resumeAvailable ? "Download resume" : null,
    "Show projects",
    contactChip(rec),
    "What stack?",
  ].filter((c): c is string => c !== null);
}

function motionRequest(q: string): "still" | "calm" | "lively" | null {
  if (!/\b(motion|animation|animations|moving|movement)\b/.test(q)) return null;
  if (/\b(off|stop|still|less|reduce|no)\b/.test(q)) return "still";
  if (/\b(calm|gentle|slow)\b/.test(q)) return "calm";
  if (/\b(on|more|lively|full)\b/.test(q)) return "lively";
  return null;
}

const STOP = new Set([
  "the",
  "a",
  "an",
  "is",
  "to",
  "of",
  "and",
  "or",
  "for",
  "how",
  "can",
  "i",
  "does",
  "do",
  // question words and pronouns say nothing about which FAQ is meant
  "what",
  "where",
  "who",
  "why",
  "when",
  "which",
  "are",
  "have",
  "has",
  "they",
  "them",
  "their",
  "you",
  "with",
]);
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

/** How many meaningful words a question shares with an FAQ heading. */
function overlap(q: string, question: string): number {
  const asked = new Set(words(q));
  return words(question).filter((w) => asked.has(w)).length;
}

const contactChip = (rec: AgentRecord) => `Contact ${rec.name}`;
