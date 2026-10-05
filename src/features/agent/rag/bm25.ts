import { queryGroups, tokenize } from "./tokenize";
import type { Chunk, IndexedChunk, RagIndex } from "./types";

const K1 = 1.2;
const B = 0.75;

export type Scored = { id: string; score: number };

/** Term statistics for BM25 over each chunk's header and text. */
export function indexChunks(chunks: Chunk[]): Pick<RagIndex, "avgLen" | "df" | "chunks"> {
  const df: Record<string, number> = {};
  const indexed: IndexedChunk[] = chunks.map((c) => {
    const tokens = tokenize(`${c.header} ${c.text}`);
    const tf: Record<string, number> = {};
    for (const t of tokens) tf[t] = (tf[t] ?? 0) + 1;
    for (const t of Object.keys(tf)) df[t] = (df[t] ?? 0) + 1;
    return { ...c, tf, len: tokens.length };
  });
  const avgLen = indexed.reduce((sum, c) => sum + c.len, 0) / Math.max(1, indexed.length);
  return { avgLen, df, chunks: indexed };
}

/** Inverse document frequency. */
function idf(index: RagIndex, term: string): number {
  const df = index.df[term] ?? 0;
  return Math.log(1 + (index.chunks.length - df + 0.5) / (df + 0.5));
}

/** Okapi BM25 over the query and its synonyms, best first. Only chunks sharing a term are returned. */
export function bm25(index: RagIndex, query: string, limit: number): Scored[] {
  const terms = [...new Set(queryGroups(query).flat())].filter((t) => index.df[t]);
  if (!terms.length) return [];
  const weights = new Map(terms.map((t) => [t, idf(index, t)]));
  const scored: Scored[] = [];
  for (const c of index.chunks) {
    let score = 0;
    for (const t of terms) {
      const f = c.tf[t];
      if (!f) continue;
      score += (weights.get(t)! * f * (K1 + 1)) / (f + K1 * (1 - B + (B * c.len) / index.avgLen));
    }
    if (score > 0) scored.push({ id: c.id, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
