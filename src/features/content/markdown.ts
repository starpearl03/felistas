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

/** Body paragraphs separated by blank lines, with headings dropped. */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.startsWith("#"))
    .map((p) => p.replace(/\s*\n\s*/g, " "));
}

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
