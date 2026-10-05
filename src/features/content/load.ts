import "server-only";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { z } from "zod";
import {
  emphasisParts,
  paragraphs,
  plainText,
  sectionsByHeading,
  splitFrontmatter,
} from "./markdown";
import {
  educationSchema,
  faqSchema,
  profileSchema,
  projectSchema,
  roleSchema,
  skillsSchema,
  slugSchema,
} from "./schema";
import type { Site } from "./types";

export const CONTENT_DIR = path.join(process.cwd(), "content");

export class ContentError extends Error {
  constructor(
    readonly file: string,
    detail: string,
  ) {
    super(`content/${file}: ${detail}`);
    this.name = "ContentError";
  }
}

/** "not found" only for a missing path; any other read error keeps its real cause. */
function readFailure(err: unknown, kind: "file" | "folder"): string {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === "ENOENT") return `${kind} not found`;
  return `could not read ${kind}: ${(err as Error).message}`;
}

type Parsed<S extends z.ZodType> = { data: z.output<S>; body: string; slug: string };

async function readEntry<S extends z.ZodType>(
  root: string,
  rel: string,
  schema: S,
): Promise<Parsed<S>> {
  const file = rel.replaceAll("\\", "/");
  let source: string;
  try {
    source = await readFile(path.join(root, rel), "utf8");
  } catch (err) {
    throw new ContentError(file, readFailure(err, "file"));
  }
  let fm;
  try {
    fm = splitFrontmatter(source);
  } catch (err) {
    throw new ContentError(file, (err as Error).message);
  }
  const result = schema.safeParse(fm.data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new ContentError(file, issues);
  }
  const slug = path.basename(rel, ".md");
  return { data: result.data, body: fm.body, slug };
}

async function readFolder<S extends z.ZodType>(root: string, dir: string, schema: S) {
  let names: string[];
  try {
    names = (await readdir(path.join(root, dir))).filter((n) => n.endsWith(".md"));
  } catch (err) {
    throw new ContentError(dir, readFailure(err, "folder"));
  }
  return Promise.all(
    names.sort().map(async (name) => {
      const entry = await readEntry(root, path.join(dir, name), schema);
      const slug = slugSchema.safeParse(entry.slug);
      if (!slug.success)
        throw new ContentError(`${dir}/${name}`, `file name ${slug.error.issues[0].message}`);
      return entry;
    }),
  );
}

function strip<T extends { sample: boolean }>(data: T): Omit<T, "sample"> {
  const rest: Partial<T> = { ...data };
  delete rest.sample;
  return rest as Omit<T, "sample">;
}

/** Reads and validates every file in a content folder. Throws a ContentError naming the bad file. */
export async function loadSiteFrom(root: string): Promise<Site> {
  const [profile, skills, faq, projects, roles, education] = await Promise.all([
    readEntry(root, "profile.md", profileSchema),
    readEntry(root, "skills.md", skillsSchema),
    readEntry(root, "faq.md", faqSchema),
    readFolder(root, "projects", projectSchema),
    readFolder(root, "experience", roleSchema),
    readFolder(root, "education", educationSchema),
  ]);

  const current = roles.filter((r) => r.data.current);
  // The Experience ruler and the agent rely on exactly one current role
  if (current.length !== 1) {
    throw new ContentError(
      "experience",
      `exactly one role must have current: true, found ${current.length}`,
    );
  }

  const all = [profile, skills, faq, ...projects, ...roles, ...education];

  return {
    profile: {
      ...strip(profile.data),
      line: plainText(profile.data.line),
      lineParts: emphasisParts(profile.data.line),
      about: paragraphs(profile.body),
    },
    skills: { ...strip(skills.data), body: skills.body },
    projects: projects
      .map((p) => ({ ...strip(p.data), id: p.slug, body: p.body }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    experience: roles
      .map((r) => ({ ...strip(r.data), slug: r.slug, body: r.body }))
      .sort((a, b) => a.start - b.start),
    education: education
      .map((e) => ({ ...strip(e.data), slug: e.slug, body: e.body }))
      .sort((a, b) => a.order - b.order),
    faq: sectionsByHeading(faq.body).map((s) => ({ question: s.heading, answer: s.text })),
    sample: all.some((e) => e.data.sample),
  };
}

let warned = false;

/** The site content, read once per request (React cache) and validated. */
export const loadSite = cache(async (): Promise<Site> => {
  const site = await loadSiteFrom(CONTENT_DIR);
  if (site.sample && process.env.NODE_ENV === "production" && !warned) {
    warned = true;
    console.warn(
      "content: sample placeholders are still in content/ (sample: true). Replace them before launch.",
    );
  }
  return site;
});
