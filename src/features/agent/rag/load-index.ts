import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadSite } from "@/features/content/server";
import { buildIndex } from "./build";
import { buildChunks } from "./chunk";
import { RAG_INDEX_VERSION, type RagIndex } from "./types";

/** Written by `npm run rag:index`, which runs before every build */
export const RAG_INDEX_FILE = path.join(process.cwd(), "src", "generated", "rag-index.json");

async function readGenerated(): Promise<RagIndex | null> {
  try {
    const index = JSON.parse(await readFile(RAG_INDEX_FILE, "utf8")) as RagIndex;
    return index.version === RAG_INDEX_VERSION ? index : null;
  } catch {
    return null;
  }
}

let cached: Promise<RagIndex> | null = null;

/**
 * The generated index, or a BM25-only index built from content when the file is missing or stale
 * (a dev server before the first `rag:index`). Read once per production instance.
 */
export async function ragIndex(): Promise<RagIndex> {
  const fromContent = async () => {
    const site = await loadSite();
    return buildIndex(buildChunks(site), site.profile.name);
  };
  const load = async () => (await readGenerated()) ?? fromContent();
  if (process.env.NODE_ENV !== "production") return load();
  cached ??= load();
  try {
    return await cached;
  } catch (err) {
    cached = null;
    throw err;
  }
}
