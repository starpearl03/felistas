import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SECTION_IDS } from "@/features/content";
import { CONTENT_DIR, ContentError, loadSiteFrom } from "@/features/content/server";
import { FIXTURE_CONTENT } from "../fixtures/paths";

describe("the real content/ folder", () => {
  it("loads, validates and orders everything", async () => {
    const site = await loadSiteFrom(CONTENT_DIR);

    expect(site.profile.name).toBe("Felistas");
    expect(site.profile.fullName).toBe("Felistas Charuka");
    expect(site.profile.about.length).toBeGreaterThan(0);
    expect(site.profile.line).not.toContain("*");
    expect(site.profile.lineParts.some((p) => p.em)).toBe(true);
    expect(site.skills.groups.flatMap((g) => g.items).length).toBeGreaterThan(10);

    const projectIds = site.projects.map((p) => p.id);
    expect(new Set(projectIds).size).toBe(projectIds.length);
    expect(site.projects.map((p) => p.order)).toEqual(
      [...site.projects.map((p) => p.order)].sort((a, b) => a - b),
    );

    const starts = site.experience.map((r) => r.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(site.experience.filter((r) => r.current).length).toBeLessThanOrEqual(1);
    for (const role of site.experience) expect(role.end).toBeGreaterThan(role.start);

    expect(site.faq.length).toBeGreaterThan(0);
    for (const entry of site.faq) {
      expect(entry.question).toMatch(/\?$/);
      expect(entry.answer.length).toBeGreaterThan(0);
    }
  });

  it("is real content, not the sample placeholders", async () => {
    expect((await loadSiteFrom(CONTENT_DIR)).sample).toBe(false);
  });

  it("keeps the middle name out of everything the page shows", async () => {
    const site = await loadSiteFrom(CONTENT_DIR);
    // only the seo block may carry it (search engines, never rendered)
    const { seo, ...shown } = site.profile;
    const visible = JSON.stringify({ ...site, profile: shown });
    expect(visible).not.toMatch(/Varaidzo/i);
    expect(seo.alternateNames.join(" ")).toMatch(/Varaidzo/);
  });
});

describe("page structure", () => {
  it("starts with home and has unique section ids", () => {
    expect(SECTION_IDS[0]).toBe("home");
    expect(new Set(SECTION_IDS).size).toBe(SECTION_IDS.length);
  });
});

describe("validation errors name the file", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "felistas-content-"));
    await cp(FIXTURE_CONTENT, dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const write = (rel: string, text: string) => writeFile(path.join(dir, rel), text, "utf8");

  it("reports a missing required field", async () => {
    await write("projects/broken.md", "---\nkind: Thing\nstatus: LIVE\n---\n");
    await expect(loadSiteFrom(dir)).rejects.toThrow(/content\/projects\/broken\.md: .*name/);
  });

  it("rejects unknown keys so typos don't vanish silently", async () => {
    await write(
      "education/typo.md",
      '---\nyear: "2021"\ntitle: T\norg: O\norder: 3\nnote: N\nnoet: typo\n---\n',
    );
    await expect(loadSiteFrom(dir)).rejects.toThrow(/education\/typo\.md/);
  });

  it("rejects a role that ends before it starts", async () => {
    await write(
      "experience/backwards.md",
      "---\nrole: R\norg: O\nperiod: P\nstart: 2024\nend: 2020\npoints: [x]\n---\n",
    );
    await expect(loadSiteFrom(dir)).rejects.toThrow(/end must be after start/);
  });

  it("rejects file names that are not kebab-case ids", async () => {
    await write(
      "projects/Bad_Name.md",
      '---\nname: N\nkind: K\nstatus: WIP\nyear: "2026"\norder: 9\nstack: [Go]\ndesc: D\nmetric: "1"\nmetricLabel: L\n---\n',
    );
    await expect(loadSiteFrom(dir)).rejects.toBeInstanceOf(ContentError);
  });

  it("rejects two current roles", async () => {
    await write(
      "experience/second-current.md",
      "---\nrole: R\norg: O\nperiod: P\nstart: 2025\nend: 2026\ncurrent: true\npoints: [x]\n---\n",
    );
    await expect(loadSiteFrom(dir)).rejects.toThrow(
      /at most one role may have current: true, found 2/,
    );
  });

  it("accepts content with no current role (between jobs)", async () => {
    const rel = "experience/northwind-labs.md";
    const text = await readFile(path.join(dir, rel), "utf8");
    await write(rel, text.replace(/^current: true\n/m, ""));
    const site = await loadSiteFrom(dir);
    expect(site.experience.some((r) => r.current)).toBe(false);
  });

  it("reports the real cause when a path exists but cannot be read as a file", async () => {
    await rm(path.join(dir, "faq.md"));
    await mkdir(path.join(dir, "faq.md"));
    await expect(loadSiteFrom(dir)).rejects.toThrow(/content\/faq\.md: could not read file/);
  });

  it("reports a missing file as not found", async () => {
    await rm(path.join(dir, "skills.md"));
    await expect(loadSiteFrom(dir)).rejects.toThrow(/content\/skills\.md: file not found/);
  });

  it("clears the sample flag once no file carries it", async () => {
    const strip = async (rel: string) => {
      const text = await readFile(path.join(dir, rel), "utf8");
      await write(rel, text.replace(/^sample: true\n/m, ""));
    };
    for (const rel of ["profile.md", "skills.md", "faq.md"]) await strip(rel);
    for (const folder of ["projects", "experience", "education"]) {
      for (const name of await readdir(path.join(dir, folder))) await strip(`${folder}/${name}`);
    }
    expect((await loadSiteFrom(dir)).sample).toBe(false);
  });
});
