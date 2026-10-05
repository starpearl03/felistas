import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed, embedMany } from "ai";

export const EMBEDDING_MODEL = "gemini-embedding-001";
/** Reduced from the model's 3072 dimensions: plenty for a small corpus, and a smaller index */
export const EMBEDDING_DIMS = 768;

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

const options = (taskType: TaskType) => ({
  google: { outputDimensionality: EMBEDDING_DIMS, taskType },
});

/** Scaled to length 1, so a dot product is the cosine similarity. Reduced Gemini vectors are not. */
export function normalize(v: number[]): number[] {
  const norm = Math.hypot(...v);
  return norm ? v.map((x) => x / norm) : v;
}

const model = (apiKey: string) =>
  createGoogleGenerativeAI({ apiKey }).embeddingModel(EMBEDDING_MODEL);

/** Document vectors for the index (build time). */
export async function embedDocuments(texts: string[], apiKey: string): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: model(apiKey),
    values: texts,
    providerOptions: options("RETRIEVAL_DOCUMENT"),
    maxParallelCalls: 2,
  });
  return embeddings.map(normalize);
}

/** A query vector (request time). */
export async function embedQuery(
  text: string,
  apiKey: string,
  abortSignal?: AbortSignal,
): Promise<number[]> {
  const { embedding } = await embed({
    model: model(apiKey),
    value: text,
    providerOptions: options("RETRIEVAL_QUERY"),
    maxRetries: 0,
    abortSignal,
  });
  return normalize(embedding);
}
