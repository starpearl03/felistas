import type { SectionId } from "@/features/content";

export type ChunkKind = "card" | "body" | "faq";

/** One retrievable piece of the record, built from `content/`. */
export type Chunk = {
  /** Stable across rebuilds, e.g. "project:ledgerline:approach". The golden set refers to these. */
  id: string;
  kind: ChunkKind;
  section: SectionId;
  /** The project id, role slug or education slug the chunk belongs to */
  entityId: string | null;
  /** A short label for a source chip, e.g. "Projects · Ledgerline" */
  title: string;
  /** Where the chunk sits in the record, prepended before indexing (contextual retrieval) */
  header: string;
  text: string;
  /** Hash of header and text; the embedding cache key */
  hash: string;
};

export type IndexedChunk = Chunk & {
  /** Term frequencies of the tokenised header and text */
  tf: Record<string, number>;
  /** Token count */
  len: number;
  /** L2-normalised document embedding; absent in a BM25-only index */
  vector?: number[];
};

/** Bumped whenever tokenising or the file shape changes, so a stale generated index is rebuilt. */
export const RAG_INDEX_VERSION = 1;

export type RagIndex = {
  version: number;
  /** The embedding model behind the vectors, or null for a BM25-only index */
  embedding: { model: string; dims: number } | null;
  /** Tokens of the person's name: a question about only them goes to the profile */
  subject: string[];
  /** Average token count, for BM25 length normalisation */
  avgLen: number;
  /** Document frequency of each term */
  df: Record<string, number>;
  chunks: IndexedChunk[];
};
