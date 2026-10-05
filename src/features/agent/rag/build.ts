import { indexChunks } from "./bm25";
import { tokenize } from "./tokenize";
import { RAG_INDEX_VERSION, type Chunk, type RagIndex } from "./types";

export type Embeddings = {
  model: string;
  dims: number;
  /** Vectors by chunk hash */
  vectors: Map<string, number[]>;
};

/**
 * The retrieval index for a set of chunks. With embeddings, every chunk must have a vector;
 * without them the index is BM25 only.
 */
export function buildIndex(
  chunks: Chunk[],
  subject: string,
  embeddings: Embeddings | null = null,
): RagIndex {
  const stats = indexChunks(chunks);
  if (embeddings) {
    const missing = chunks.filter((c) => !embeddings.vectors.has(c.hash));
    if (missing.length) throw new Error(`no vector for ${missing.map((c) => c.id).join(", ")}`);
  }
  return {
    version: RAG_INDEX_VERSION,
    embedding: embeddings ? { model: embeddings.model, dims: embeddings.dims } : null,
    subject: tokenize(subject),
    ...stats,
    chunks: stats.chunks.map((c) =>
      embeddings ? { ...c, vector: embeddings.vectors.get(c.hash) } : c,
    ),
  };
}
