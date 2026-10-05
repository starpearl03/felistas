// Builds src/generated/rag-index.json from content/ (npm run rag:index; runs before every build).
// With GEMINI_API_KEY the index is hybrid: Gemini embeddings, cached by chunk hash in .cache/ so a
// rebuild only spends free quota on changed text. Without a key, or if embedding fails, it is BM25 only.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildIndex, type Embeddings } from "@/features/agent/rag/build";
import { buildChunks } from "@/features/agent/rag/chunk";
import { EMBEDDING_DIMS, EMBEDDING_MODEL, embedDocuments } from "@/features/agent/rag/embed";
import { RAG_INDEX_FILE } from "@/features/agent/rag/load-index";
import type { Chunk } from "@/features/agent/rag/types";
import { CONTENT_DIR, loadSiteFrom } from "@/features/content/server";

const CACHE_FILE = path.join(process.cwd(), ".cache", "rag-embeddings.json");
const cacheKey = (hash: string) => `${EMBEDDING_MODEL}:${EMBEDDING_DIMS}:${hash}`;

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function readCache(): Promise<Record<string, number[]>> {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf8")) as Record<string, number[]>;
  } catch {
    return {};
  }
}

async function embedAll(chunks: Chunk[], apiKey: string): Promise<Embeddings> {
  const cache = await readCache();
  const todo = chunks.filter((c) => !cache[cacheKey(c.hash)]);
  if (todo.length) {
    const vectors = await embedDocuments(
      todo.map((c) => `${c.header}\n${c.text}`),
      apiKey,
    );
    todo.forEach((c, i) => (cache[cacheKey(c.hash)] = vectors[i]));
    // Keep only the vectors in use, so the cache never grows past the corpus
    const used = Object.fromEntries(chunks.map((c) => [cacheKey(c.hash), cache[cacheKey(c.hash)]]));
    await mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(used));
  }
  console.log(`rag:index: ${todo.length} embedded, ${chunks.length - todo.length} from cache`);
  return {
    model: EMBEDDING_MODEL,
    dims: EMBEDDING_DIMS,
    vectors: new Map(chunks.map((c) => [c.hash, cache[cacheKey(c.hash)]])),
  };
}

async function main() {
  const site = await loadSiteFrom(CONTENT_DIR);
  const chunks = buildChunks(site);
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  let embeddings: Embeddings | null = null;
  if (apiKey) {
    try {
      embeddings = await embedAll(chunks, apiKey);
    } catch (err) {
      // A quota or network failure must not break the build; BM25 alone still answers
      console.warn(`rag:index: embedding failed, building BM25 only. ${(err as Error).message}`);
    }
  }

  const index = buildIndex(chunks, site.profile.name, embeddings);
  await mkdir(path.dirname(RAG_INDEX_FILE), { recursive: true });
  await writeFile(RAG_INDEX_FILE, JSON.stringify(index));
  console.log(
    `rag:index: ${chunks.length} chunks, ${index.embedding ? `hybrid (${index.embedding.model})` : "BM25 only"} → ${path.relative(process.cwd(), RAG_INDEX_FILE)}`,
  );
}

main().catch((err: unknown) => {
  console.error(`rag:index: ${(err as Error).message}`);
  process.exit(1);
});
