import { z } from "zod";

// Frontmatter schemas for the files in content/. Objects are strict so a typo in a key fails the build
// instead of silently disappearing from the site.

const text = z.string().trim().min(1);
const year = z.string().regex(/^\d{4}$/, 'expected a four-digit year in quotes, like "2025"');
const sample = z.boolean().default(false);

export const profileSchema = z.strictObject({
  sample,
  name: text,
  role: text,
  line: text,
  availability: text,
  now: text,
  facts: z.array(z.strictObject({ label: text, value: text })).min(1),
  email: z.email(),
  domain: z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "expected a domain like felistas.dev"),
  links: z.strictObject({ github: z.url(), linkedin: z.url() }),
  resume: z.strictObject({
    href: z.string().startsWith("/"),
    file: text,
    pages: z.number().int().positive(),
    size: text,
    updated: text,
  }),
});

export const skillsSchema = z.strictObject({
  sample,
  groups: z.array(z.strictObject({ name: text, items: z.array(text).min(1) })).min(1),
});

export const projectSchema = z.strictObject({
  sample,
  name: text,
  kind: text,
  status: z.enum(["LIVE", "WIP"]),
  year,
  order: z.number().int(),
  stack: z.array(text).min(1),
  desc: text,
  metric: text,
  metricLabel: text,
  url: z.url().optional(),
});

export const roleSchema = z
  .strictObject({
    sample,
    role: text,
    org: text,
    period: text,
    start: z.number(),
    end: z.number(),
    current: z.boolean().default(false),
    points: z.array(text).min(1),
  })
  .refine((r) => r.end > r.start, { message: "end must be after start", path: ["end"] });

export const educationSchema = z.strictObject({
  sample,
  year,
  title: text,
  org: text,
  order: z.number().int(),
  note: text,
});

export const faqSchema = z.strictObject({ sample });

/** File names become ids, so they must be URL-safe. */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lower-case kebab-case");
