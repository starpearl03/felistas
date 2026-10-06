import { createHash } from "node:crypto";
import { PROJECT_STATUS, type SectionId, type Site } from "@/features/content";
import type { Chunk, ChunkKind } from "./types";

// Chunking for retrieval (contextual chunk headers, as in Anthropic's "Contextual Retrieval"):
// one card per entity from its frontmatter, heading-aware chunks of every body, one chunk per FAQ.

/** Ids of the profile chunks start with this; a question about only the person goes to them */
export const PROFILE_PREFIX = "profile:";

/** About 350 tokens */
const MAX_WORDS = 260;

/** Section names with the plain words visitors use for them, so the header carries both */
const SECTION_CONTEXT: Record<SectionId, string> = {
  home: "Intro",
  about: "About (profile, background, skills)",
  projects: "Projects (portfolio work)",
  experience: "Experience (work history, jobs, employers)",
  education: "Education (degrees, certifications, study)",
  contact: "Contact (email, links, resume)",
};

const LABEL: Record<SectionId, string> = {
  home: "Intro",
  about: "About",
  projects: "Projects",
  experience: "Experience",
  education: "Education",
  contact: "Contact",
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Splits text into parts of at most MAX_WORDS, breaking only between paragraphs. */
function splitLong(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (const para of text.split(/\n{2,}/)) {
    if (current && wordCount(current) + wordCount(para) > MAX_WORDS) {
      parts.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/** A Markdown body as `{ heading, text }` sections; a body without `##` headings is one section. */
function bodySections(body: string): { heading: string | null; text: string }[] {
  const out: { heading: string | null; text: string }[] = [];
  let current: { heading: string | null; lines: string[] } = { heading: null, lines: [] };
  const flush = () => {
    const text = current.lines
      .join("\n")
      .split(/\n{2,}/)
      .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
      .filter((p) => p && !/^#{1,6}\s/.test(p))
      .join("\n\n");
    if (text) out.push({ heading: current.heading, text });
  };
  for (const line of body.split("\n")) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      current = { heading: heading[1], lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  flush();
  return out;
}

/** Every chunk of the record, in a stable order. */
export function buildChunks(site: Site): Chunk[] {
  const name = site.profile.name;
  const chunks: Chunk[] = [];

  const add = (c: {
    id: string;
    kind: ChunkKind;
    section: SectionId;
    entityId?: string | null;
    title: string;
    path: string[];
    text: string;
  }) => {
    const header = [name, SECTION_CONTEXT[c.section], ...c.path].join(" › ");
    chunks.push({
      id: c.id,
      kind: c.kind,
      section: c.section,
      entityId: c.entityId ?? null,
      title: c.title,
      header,
      text: c.text,
      hash: createHash("sha256").update(`${header}\n${c.text}`).digest("hex").slice(0, 16),
    });
  };

  /** Body sections as chunks: "<base>:<heading>" or "<base>:notes", with -2, -3 for long ones */
  const addBody = (
    base: string,
    body: string,
    meta: { section: SectionId; entityId?: string; title: string; path: string[] },
  ) => {
    for (const { heading, text } of bodySections(body)) {
      const parts = splitLong(text);
      parts.forEach((part, i) => {
        const key = `${base}:${heading ? slug(heading) : "notes"}${i ? `-${i + 1}` : ""}`;
        add({
          ...meta,
          id: key,
          kind: "body",
          path: heading ? [...meta.path, heading] : meta.path,
          text: part,
        });
      });
    }
  };

  // ---- profile ----
  const p = site.profile;
  add({
    id: "profile:card",
    kind: "card",
    section: "about",
    title: LABEL.about,
    path: ["Profile"],
    text: [
      `${p.name} is a ${p.role.toLowerCase()}.`,
      p.line,
      `${p.availability}.`,
      `Now: ${p.now}`,
      ...p.facts.map((f) => `${f.label}: ${f.value}.`),
    ].join(" "),
  });
  addBody("profile", site.profile.about.join("\n\n"), {
    section: "about",
    title: LABEL.about,
    path: ["Profile"],
  });

  // ---- skills ----
  add({
    id: "skills:card",
    kind: "card",
    section: "about",
    title: "About · Skills",
    path: ["Skills and stack"],
    text: site.skills.groups.map((g) => `${g.name}: ${g.items.join(", ")}.`).join(" "),
  });
  addBody("skills", site.skills.body, {
    section: "about",
    title: "About · Skills",
    path: ["Skills and stack"],
  });

  // ---- projects ----
  for (const pr of site.projects) {
    const meta = {
      section: "projects" as const,
      entityId: pr.id,
      title: `${LABEL.projects} · ${pr.name}`,
      path: [`${pr.name} (${pr.kind}, ${pr.year})`],
    };
    add({
      ...meta,
      id: `project:${pr.id}:card`,
      kind: "card",
      text: [
        `${pr.name} is a ${pr.kind.toLowerCase()} project, ${PROJECT_STATUS[pr.status].since} ${pr.year}.`,
        pr.desc,
        `Stack: ${pr.stack.join(", ")}.`,
        `${pr.metric} ${pr.metricLabel}.`,
        pr.url ? `Link: ${pr.url}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
    addBody(`project:${pr.id}`, pr.body, meta);
  }

  // ---- experience ----
  for (const r of site.experience) {
    const meta = {
      section: "experience" as const,
      entityId: r.slug,
      title: `${LABEL.experience} · ${r.org}`,
      path: [`${r.org}, ${r.role} (${r.period})`],
    };
    add({
      ...meta,
      id: `role:${r.slug}:card`,
      kind: "card",
      text: [
        `${r.role} at ${r.org}, ${r.period}${r.current ? ", the current role" : ""}.`,
        ...r.points.map((pt) => `${pt}.`),
      ].join(" "),
    });
    addBody(`role:${r.slug}`, r.body, meta);
  }

  // ---- education ----
  for (const e of site.education) {
    const meta = {
      section: "education" as const,
      entityId: e.slug,
      title: `${LABEL.education} · ${e.title}`,
      path: [`${e.title} (${e.year})`],
    };
    add({
      ...meta,
      id: `education:${e.slug}:card`,
      kind: "card",
      text: `${e.title}, ${e.org}, completed ${e.year}. ${e.note}`,
    });
    addBody(`education:${e.slug}`, e.body, meta);
  }

  // ---- FAQ ----
  for (const f of site.faq) {
    add({
      id: `faq:${slug(f.question)}`,
      kind: "faq",
      section: "about",
      title: "About · FAQ",
      path: ["Questions visitors ask"],
      text: `${f.question} ${f.answer.replace(/\n{2,}/g, " ")}`,
    });
  }

  // ---- contact and resume ----
  const r = p.resume;
  add({
    id: "contact:card",
    kind: "card",
    section: "contact",
    title: LABEL.contact,
    path: ["How to reach " + name],
    text: [
      `Email: ${p.email}. Website: ${p.domain}. GitHub: ${p.links.github}. LinkedIn: ${p.links.linkedin}.`,
      r.available
        ? `The resume is a ${r.pages}-page PDF (${r.size}), updated ${r.updated}.`
        : "The resume is not published yet.",
    ].join(" "),
  });

  return chunks;
}
