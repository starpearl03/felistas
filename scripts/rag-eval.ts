// Retrieval quality against tests/rag/golden.json (npm run rag:eval).
//   --bm25         BM25 only, built fresh from content (deterministic; what CI runs)
//   --min-recall=N exit 1 when recall@6 is below N
// Without --bm25, the generated index and GEMINI_API_KEY are used for hybrid retrieval when present.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { buildIndex } from "@/features/agent/rag/build";
import { buildChunks } from "@/features/agent/rag/chunk";
import { embedQuery } from "@/features/agent/rag/embed";
import { RAG_INDEX_FILE } from "@/features/agent/rag/load-index";
import { retrieve, TOP_K } from "@/features/agent/rag/retrieve";
import { RAG_INDEX_VERSION, type RagIndex } from "@/features/agent/rag/types";
import { SECTION_IDS } from "@/features/content";
import { CONTENT_DIR, loadSiteFrom } from "@/features/content/server";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const goldenSchema = z.object({
  questions: z.array(
    z.object({
      q: z.string(),
      expect: z.array(z.string()),
      context: z
        .object({
          section: z.enum(SECTION_IDS),
          projectId: z.string().nullable(),
          roleSlug: z.string().nullable(),
        })
        .optional(),
    }),
  ),
});

const args = process.argv.slice(2);
const lexicalOnly = args.includes("--bm25");
const minRecall = Number(args.find((a) => a.startsWith("--min-recall="))?.split("=")[1] ?? 0);

async function loadIndex(): Promise<RagIndex> {
  const fresh = async () => {
    const site = await loadSiteFrom(CONTENT_DIR);
    return buildIndex(buildChunks(site), site.profile.name);
  };
  if (lexicalOnly || !existsSync(RAG_INDEX_FILE)) return fresh();
  const generated = JSON.parse(await readFile(RAG_INDEX_FILE, "utf8")) as RagIndex;
  return generated.version === RAG_INDEX_VERSION ? generated : fresh();
}

async function main() {
  const golden = goldenSchema.parse(
    JSON.parse(await readFile("tests/rag/golden.json", "utf8")),
  ).questions;
  const index = await loadIndex();
  const ids = new Set(index.chunks.map((c) => c.id));
  const unknown = golden.flatMap((g) => g.expect.filter((id) => !ids.has(id)));
  if (unknown.length) throw new Error(`golden.json names unknown chunk ids: ${unknown.join(", ")}`);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const embed = !lexicalOnly && apiKey ? (q: string) => embedQuery(q, apiKey) : undefined;

  let found = 0;
  let rr = 0;
  let answerable = 0;
  let abstained = 0;
  let unanswerable = 0;
  let mode = "lexical";
  const misses: string[] = [];

  for (const g of golden) {
    const result = await retrieve(index, g.q, { context: g.context, embedQuery: embed });
    mode = result.mode;
    const top = result.hits.map((h) => h.chunk.id);
    if (!g.expect.length) {
      unanswerable += 1;
      if (result.lowConfidence) abstained += 1;
      else misses.push(`  should abstain: "${g.q}" → ${top[0]}`);
      continue;
    }
    answerable += 1;
    const rank = top.findIndex((id) => g.expect.includes(id));
    if (rank >= 0) {
      found += 1;
      rr += 1 / (rank + 1);
    } else {
      misses.push(`  miss: "${g.q}" → ${top.slice(0, 3).join(", ") || "nothing"}`);
    }
    if (result.lowConfidence && rank >= 0) misses.push(`  low confidence on a hit: "${g.q}"`);
  }

  const recall = found / answerable;
  console.log(
    [
      `rag:eval (${mode}, ${index.chunks.length} chunks, ${golden.length} questions)`,
      `  recall@${TOP_K}: ${recall.toFixed(3)} (${found}/${answerable})`,
      `  MRR:       ${(rr / answerable).toFixed(3)}`,
      `  abstains:  ${abstained}/${unanswerable} unanswerable questions`,
      ...misses,
    ].join("\n"),
  );
  if (recall < minRecall || abstained < unanswerable) {
    console.error(`rag:eval: below the gate (recall@${TOP_K} ≥ ${minRecall}, every abstain)`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(`rag:eval: ${(err as Error).message}`);
  process.exit(1);
});
