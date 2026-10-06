import { beforeAll, describe, expect, it } from "vitest";
import { buildRecord, respondOffline } from "@/features/agent";
import {
  buildChunks,
  buildIndex,
  MIN_BM25,
  type RagIndex,
  retrieve,
  retrieveLexical,
  TOP_K,
} from "@/features/agent/server";
import { rrf } from "@/features/agent/rag/fusion";
import { queryGroups, stem, tokenize } from "@/features/agent/rag/tokenize";
import type { Site } from "@/features/content";
import { loadSiteFrom } from "@/features/content/server";
import { FIXTURE_CONTENT } from "../fixtures/paths";

let site: Site;
let index: RagIndex;

beforeAll(async () => {
  site = await loadSiteFrom(FIXTURE_CONTENT);
  index = buildIndex(buildChunks(site), site.profile.name);
});

const top = (q: string, ctx: Parameters<typeof retrieveLexical>[2] = null) =>
  retrieveLexical(index, q, ctx).hits.map((h) => h.chunk.id);

describe("tokenize", () => {
  it("lower-cases, drops stopwords and stems plain words only", () => {
    expect(tokenize("How does the engine match transactions?")).toEqual([
      "engine",
      "match",
      "transaction",
    ]);
    expect(["matches", "matched", "matching"].map(stem)).toEqual(["match", "match", "match"]);
    expect(["p95", "deployments", "deployed"].map(stem)).toEqual(["p95", "deploy", "deploy"]);
    expect(tokenize("Café résumé")).toEqual(["cafe", "resume"]);
  });

  it("adds synonyms the record spells differently", () => {
    expect(queryGroups("open to a new job")).toContainEqual(["job", "role"]);
  });
});

describe("chunks", () => {
  it("gives every entity a card and keeps ids unique and stable", () => {
    const chunks = buildChunks(site);
    const ids = chunks.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of site.projects) expect(ids).toContain(`project:${p.id}:card`);
    for (const r of site.experience) expect(ids).toContain(`role:${r.slug}:card`);
    expect(ids).toContain("project:ledgerline:approach");
    expect(chunks.filter((c) => c.kind === "faq")).toHaveLength(site.faq.length);
    expect(buildChunks(site).map((c) => c.hash)).toEqual(chunks.map((c) => c.hash));
  });

  it("prepends a contextual header naming where the chunk sits", () => {
    const approach = buildChunks(site).find((c) => c.id === "project:ledgerline:approach")!;
    expect(approach.header).toBe(
      "Felistas › Projects (portfolio work) › Ledgerline (Payments infrastructure, 2025) › Approach",
    );
    expect(approach).toMatchObject({ section: "projects", entityId: "ledgerline" });
  });
});

describe("fusion", () => {
  it("rewards ids ranked well in several lists", () => {
    const scores = rrf([
      ["a", "b", "c"],
      ["b", "a"],
    ]);
    expect(scores.get("a")).toBeCloseTo(1 / 61 + 1 / 62);
    expect([...scores].sort((x, y) => y[1] - x[1]).map(([id]) => id)).toEqual(["a", "b", "c"]);
  });
});

describe("retrieveLexical", () => {
  it("finds exact names and paraphrased facts", () => {
    expect(top("Tell me about Ledgerline")[0]).toMatch(/^project:ledgerline:/);
    expect(top("How was API latency reduced?").slice(0, 2)).toContain("role:kestrel-systems:notes");
    expect(top("Have they deployed to AWS?")[0]).toMatch(/^role:freelance:/);
  });

  it("sends questions about only the person to the profile", () => {
    const r = retrieveLexical(index, "Who is Felistas?");
    expect(r.lowConfidence).toBe(false);
    expect(r.hits[0].chunk.id).toBe("profile:card");
  });

  it("flags questions the record can't answer", () => {
    expect(retrieveLexical(index, "What is their favourite colour?").lowConfidence).toBe(true);
    expect(retrieveLexical(index, "Does Felistas own a cat?").lowConfidence).toBe(true);
    expect(MIN_BM25).toBeGreaterThan(0);
  });

  it("returns at most TOP_K hits", () => {
    expect(top("project").length).toBeLessThanOrEqual(TOP_K);
  });

  it("reads 'this project' as the selected one, even with no word in common", () => {
    const pulse = { section: "projects" as const, projectId: "pulse", roleSlug: null };
    expect(top("What problem did this project solve?", pulse).slice(0, 2)).toContain(
      "project:pulse:card",
    );
    // without a pointing word, the selection only nudges the ranking
    expect(top("Tell me about Ledgerline", pulse)[0]).toMatch(/^project:ledgerline:/);
  });

  it("boosts the project the visitor is looking at", () => {
    const q = "What is the stack?";
    const pulse = { section: "projects" as const, projectId: "pulse", roleSlug: null };
    expect(top(q).indexOf("project:pulse:card")).not.toBe(0);
    expect(top(q, pulse)[0]).toBe("project:pulse:card");
  });
});

describe("retrieve (hybrid)", () => {
  /** A fake embedding space: each chunk's vector points along its own axis. */
  function embedded(): { index: RagIndex; axis: (id: string) => number[] } {
    const chunks = buildChunks(site);
    const dims = chunks.length;
    const axis = (id: string) => {
      const v = new Array<number>(dims).fill(0);
      v[chunks.findIndex((c) => c.id === id)] = 1;
      return v;
    };
    const vectors = new Map(chunks.map((c) => [c.hash, axis(c.id)]));
    return { index: buildIndex(chunks, site.profile.name, { model: "fake", dims, vectors }), axis };
  }

  it("fuses BM25 with embeddings, so a paraphrase reaches the right chunk", async () => {
    const { index: hybrid, axis } = embedded();
    const q = "What is their working style?"; // BM25 alone misses this one
    const r = await retrieve(hybrid, q, {
      embedQuery: async () => axis("faq:how-does-felistas-like-to-work"),
    });
    expect(r.mode).toBe("hybrid");
    expect(r.hits.map((h) => h.chunk.id)).toContain("faq:how-does-felistas-like-to-work");
    expect(r.lowConfidence).toBe(false);
  });

  it("falls back to BM25 when embedding the question fails", async () => {
    const { index: hybrid } = embedded();
    const r = await retrieve(hybrid, "Tell me about Ledgerline", {
      embedQuery: () => Promise.reject(new Error("429")),
    });
    expect(r.mode).toBe("lexical");
    expect(r.hits[0].chunk.id).toMatch(/^project:ledgerline:/);
  });

  it("stays BM25-only for an index built without a key", async () => {
    const r = await retrieve(index, "Tell me about Atlas", { embedQuery: async () => [1] });
    expect(r.mode).toBe("lexical");
  });

  it("rejects an index with a chunk missing its vector", () => {
    const chunks = buildChunks(site);
    expect(() =>
      buildIndex(chunks, site.profile.name, { model: "fake", dims: 1, vectors: new Map() }),
    ).toThrow(/no vector/);
  });
});

describe("the offline agent's fallback", () => {
  it("quotes the best passage and shows where it lives", () => {
    const rec = buildRecord(site);
    const lookup = (q: string) => {
      const r = retrieveLexical(index, q);
      return r.lowConfidence ? null : r.hits[0].chunk;
    };
    const r = respondOffline("How fast does the dashboard render?", null, rec, lookup);
    expect(r.text).toMatch(/^From the record, Projects · Pulse: /);
    expect(r.tools).toEqual([{ name: "open_project", input: { id: "pulse" } }]);

    // the sentences that answer the question, not just the opening ones
    const mentor = respondOffline("Did they mentor anyone?", null, rec, lookup);
    expect(mentor.text).toContain("Mentored three junior engineers.");

    const hosting = respondOffline("Which hosts did they deploy on?", null, rec, lookup);
    expect(hosting.text).toMatch(/AWS (and|or) Fly.io/);

    const none = respondOffline("What is their favourite colour?", null, rec, lookup);
    expect(none.text).toMatch(/isn't in the record/);
  });
});
