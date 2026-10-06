import { afterEach, describe, expect, it, vi } from "vitest";
import { formatSize, githubRawFile, resumeMeta } from "@/features/content/server";

describe("the resume's details", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("formats sizes the way the card shows them", () => {
    expect(formatSize(277_590)).toBe("271 KB");
    expect(formatSize(200)).toBe("1 KB");
    expect(formatSize(1_300_000)).toBe("1.2 MB");
  });

  it("reads the repo, branch and path from a raw GitHub URL", () => {
    expect(
      githubRawFile("https://raw.githubusercontent.com/starpearl03/resume/main/cv/felistas.pdf"),
    ).toEqual({ owner: "starpearl03", repo: "resume", ref: "main", path: "cv/felistas.pdf" });
    expect(githubRawFile("https://example.com/starpearl03/resume/main/x.pdf")).toBeNull();
  });

  it("takes the size from the file and the date from its last commit", async () => {
    const fetchMock = vi.fn(async (url: string | URL) =>
      String(url).startsWith("https://api.github.com/")
        ? Response.json([{ commit: { committer: { date: "2026-10-06T18:36:16Z" } } }])
        : new Response(new Uint8Array(277_590)),
    );
    vi.stubGlobal("fetch", fetchMock);
    const meta = await resumeMeta(
      "https://raw.githubusercontent.com/starpearl03/resume/main/felistas-resume.pdf",
    );
    expect(meta).toEqual({ size: "271 KB", updated: "Oct 2026" });
    const api = new URL(String(fetchMock.mock.calls[1][0]));
    expect(api.pathname).toBe("/repos/starpearl03/resume/commits");
    expect(api.searchParams.get("path")).toBe("felistas-resume.pdf");
  });

  it("leaves the details out when the source can't be read", async () => {
    vi.stubGlobal("fetch", async () => new Response("gone", { status: 404 }));
    expect(await resumeMeta("https://example.com/missing.pdf")).toEqual({});
    expect(await resumeMeta(undefined)).toEqual({});
  });
});
