import { parse } from "yaml";

export type Frontmatter = { data: unknown; body: string };

/** Splits a Markdown file into its YAML frontmatter and body. The file must open with a `---` fence. */
export function splitFrontmatter(source: string): Frontmatter {
  const text = source.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  // The inner group is optional so an empty block (`---` directly followed by `---`) is valid
  const match = /^---\n(?:([\s\S]*?)\n)?---[ \t]*(?:\n|$)/.exec(text);
  if (!match) throw new Error("missing YAML frontmatter (the file must start with a --- fence)");
  return { data: parse(match[1] ?? "") ?? {}, body: text.slice(match[0].length).trim() };
}

/** A Markdown ATX heading line: one to six `#` followed by a space. "#1 priority" is not a heading. */
const HEADING_LINE = /^#{1,6}\s/;

/** Body paragraphs separated by blank lines. Heading lines are removed; the text around them is kept. */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .filter((line) => !HEADING_LINE.test(line.trim()))
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join(" "),
    )
    .filter((p) => p.length > 0);
}

/** Splits `*emphasis*` out of a single line of text. Unmatched asterisks stay as text. */
export function emphasisParts(text: string): { text: string; em: boolean }[] {
  const parts: { text: string; em: boolean }[] = [];
  const re = /\*([^*\n]+)\*/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), em: false });
    parts.push({ text: m[1], em: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), em: false });
  return parts;
}

/** The line with emphasis markers removed. */
export const plainText = (text: string): string =>
  emphasisParts(text)
    .map((p) => p.text)
    .join("");

export type MarkdownSection = { heading: string; text: string };

/** Splits a body into `## heading` sections. Text before the first heading is ignored. */
export function sectionsByHeading(body: string): MarkdownSection[] {
  const out: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;
  for (const line of body.split("\n")) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = { heading: heading[1], text: "" };
      out.push(current);
    } else if (current) {
      current.text += `${line}\n`;
    }
  }
  return out.map((s) => ({ heading: s.heading, text: paragraphs(s.text).join("\n\n") }));
}
