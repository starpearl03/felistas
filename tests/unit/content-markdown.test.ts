import { describe, expect, it } from "vitest";
import {
  emphasisParts,
  paragraphs,
  plainText,
  sectionsByHeading,
  splitFrontmatter,
} from "@/features/content/markdown";

describe("splitFrontmatter", () => {
  it("parses YAML and trims the body", () => {
    const { data, body } = splitFrontmatter("---\nname: Atlas\nstack: [Go, Rust]\n---\n\nHello.\n");
    expect(data).toEqual({ name: "Atlas", stack: ["Go", "Rust"] });
    expect(body).toBe("Hello.");
  });

  it("handles Windows line endings and a byte-order mark", () => {
    const { data, body } = splitFrontmatter("﻿---\r\nname: Atlas\r\n---\r\nBody\r\n");
    expect(data).toEqual({ name: "Atlas" });
    expect(body).toBe("Body");
  });

  it("treats empty frontmatter as an empty object", () => {
    expect(splitFrontmatter("---\n\n---\nText").data).toEqual({});
    expect(splitFrontmatter("---\n---\nText")).toEqual({ data: {}, body: "Text" });
  });

  it("rejects a file without a frontmatter fence", () => {
    expect(() => splitFrontmatter("name: Atlas\n")).toThrow(/frontmatter/);
  });
});

describe("paragraphs", () => {
  it("joins wrapped lines and drops headings", () => {
    expect(paragraphs("## Title\n\nOne\nline.\n\n\nTwo.")).toEqual(["One line.", "Two."]);
  });

  it("keeps text that sits directly under a heading", () => {
    expect(paragraphs("# About\nFelistas builds systems.\n### Sub\nMore text.")).toEqual([
      "Felistas builds systems. More text.",
    ]);
  });

  it("keeps lines that start with # but are not headings", () => {
    expect(paragraphs("#1 priority is reliability.")).toEqual(["#1 priority is reliability."]);
  });
});

describe("sectionsByHeading", () => {
  it("splits on level-two headings and ignores text before the first one", () => {
    const body =
      "Intro.\n\n## First?\n\nAnswer one.\n\n## Second?\n\nPart A.\n\nPart B.\n\n### Not a split\n";
    expect(sectionsByHeading(body)).toEqual([
      { heading: "First?", text: "Answer one." },
      { heading: "Second?", text: "Part A.\n\nPart B." },
    ]);
  });
});

describe("emphasisParts and plainText", () => {
  it("splits *emphasis* from plain text", () => {
    expect(emphasisParts("stay *calm* under load")).toEqual([
      { text: "stay ", em: false },
      { text: "calm", em: true },
      { text: " under load", em: false },
    ]);
    expect(plainText("stay *calm* under load")).toBe("stay calm under load");
  });

  it("leaves text without markers, and unmatched asterisks, alone", () => {
    expect(emphasisParts("no markers")).toEqual([{ text: "no markers", em: false }]);
    expect(plainText("5 * 3 is 15")).toBe("5 * 3 is 15");
  });
});
