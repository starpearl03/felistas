import type { PageContext } from "../types";
import { bm25, type Scored } from "./bm25";
import { PROFILE_PREFIX } from "./chunk";
import { RRF_K, rrf } from "./fusion";
import { queryGroups } from "./tokenize";
import type { Chunk, IndexedChunk, RagIndex } from "./types";

/** How many sources reach the model */
export const TOP_K = 6;
/** How many candidates each method contributes to the fusion */
const CANDIDATES = 20;
/**
 * Below these, nothing in the record really answers the question. Every golden question scores above
 * 2 on BM25, while unanswerable ones ("favourite colour") share no informative word with the record
 * and score near 0 (the name alone, in almost every chunk, adds about 0.03).
 */
export const MIN_BM25 = 1;
export const MIN_COSINE = 0.62;

/** Page-context boosts, in units of a first-place RRF vote */
const ENTITY_BOOST = 0.5;
const SECTION_BOOST = 0.25;

export type Hit = { chunk: Chunk; score: number };

export type Retrieval = {
  hits: Hit[];
  /** True when the best match is weak, so the answer should say the record doesn't cover it */
  lowConfidence: boolean;
  mode: "hybrid" | "lexical";
};

export type RetrieveOptions = {
  context?: PageContext | null;
  /** Embeds the query; without it, or when it fails, retrieval is BM25 only */
  embedQuery?: (query: string) => Promise<number[]>;
};

/** The chunk without its index data (term counts, vector), as sources are sent on */
const plain = (c: IndexedChunk): Chunk => ({
  id: c.id,
  kind: c.kind,
  section: c.section,
  entityId: c.entityId,
  title: c.title,
  header: c.header,
  text: c.text,
  hash: c.hash,
});

/** Cosine similarity against every embedded chunk (vectors are normalised, so a dot product). */
function dense(index: RagIndex, query: number[], limit: number): Scored[] {
  const scored: Scored[] = [];
  for (const c of index.chunks) {
    if (!c.vector || c.vector.length !== query.length) continue;
    let dot = 0;
    for (let i = 0; i < query.length; i++) dot += c.vector[i] * query[i];
    scored.push({ id: c.id, score: dot });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function contextBoost(c: Chunk, ctx: PageContext | null | undefined): number {
  if (!ctx) return 0;
  const selected =
    (c.section === "projects" && c.entityId !== null && c.entityId === ctx.projectId) ||
    (c.section === "experience" && c.entityId !== null && c.entityId === ctx.roleSlug);
  return (
    ((selected ? ENTITY_BOOST : 0) + (c.section === ctx.section ? SECTION_BOOST : 0)) / (RRF_K + 1)
  );
}

/** "Who is Felistas?" names only the person; BM25 can't rank that, so it goes to the profile. */
function aboutSubjectOnly(index: RagIndex, query: string): boolean {
  const groups = queryGroups(query);
  return groups.length > 0 && groups.every((g) => index.subject.includes(g[0]));
}

const profileHits = (index: RagIndex): Scored[] =>
  index.chunks
    .filter((c) => c.id.startsWith(PROFILE_PREFIX))
    .map((c, i) => ({ id: c.id, score: 1 / (i + 1) }));

/** Fuses the ranked lists, boosts what the visitor is looking at, and keeps the top few. */
function fuse(index: RagIndex, lists: Scored[][], ctx: PageContext | null | undefined): Hit[] {
  const byId = new Map(index.chunks.map((c) => [c.id, c]));
  const fused = rrf(lists.map((l) => l.map((s) => s.id)));
  return [...fused]
    .map(([id, score]) => {
      const chunk = plain(byId.get(id)!);
      return { chunk, score: score + contextBoost(chunk, ctx) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
}

/** BM25 only: synchronous, deterministic, and needs no key. The offline agent and the CI eval use it. */
export function retrieveLexical(
  index: RagIndex,
  query: string,
  context?: PageContext | null,
): Retrieval {
  if (aboutSubjectOnly(index, query)) {
    return { hits: fuse(index, [profileHits(index)], null), lowConfidence: false, mode: "lexical" };
  }
  const lexical = bm25(index, query, CANDIDATES);
  return {
    hits: fuse(index, [lexical], context),
    lowConfidence: (lexical[0]?.score ?? 0) < MIN_BM25,
    mode: "lexical",
  };
}

/** Hybrid retrieval: BM25 and embeddings fused with RRF. Falls back to BM25 if embedding fails. */
export async function retrieve(
  index: RagIndex,
  query: string,
  { context, embedQuery }: RetrieveOptions = {},
): Promise<Retrieval> {
  if (!index.embedding || !embedQuery || aboutSubjectOnly(index, query)) {
    return retrieveLexical(index, query, context);
  }
  let vector: number[];
  try {
    vector = await embedQuery(query);
  } catch {
    return retrieveLexical(index, query, context);
  }
  const lexical = bm25(index, query, CANDIDATES);
  const semantic = dense(index, vector, CANDIDATES);
  return {
    hits: fuse(index, [lexical, semantic], context),
    lowConfidence: (lexical[0]?.score ?? 0) < MIN_BM25 && (semantic[0]?.score ?? 0) < MIN_COSINE,
    mode: "hybrid",
  };
}
