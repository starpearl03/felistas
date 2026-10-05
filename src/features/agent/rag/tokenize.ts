// Tokenising for BM25. The same function runs at build time (documents) and at request time (queries).

const STOPWORDS = new Set(
  (
    "a about above after again all also am an and any are as at be been before being below between " +
    "both but by can could did do does doing down during each few for from further had has have having " +
    "he her here hers him his how i if in into is it its itself just me more most my no nor not of " +
    "off on once only or other our out over own same she should so some such than that the their theirs " +
    "them then there these they this those through to too under until up very was we were what when " +
    "where which while who whom why will with would you your yours tell show know want like please " +
    "anyone anything someone something get got ever really"
  ).split(" "),
);

/**
 * Light suffix stripping so "matches", "matched" and "matching" meet. Only plain words are stemmed:
 * tokens with digits ("p95", "s3") stay exactly as written.
 */
export function stem(word: string): string {
  if (!/^[a-z]+$/.test(word) || word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (/ments?$/.test(word) && word.length > 7) return word.replace(/ments?$/, "");
  if (/(s|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** Lower-cased, accent-free word tokens with stopwords removed and light stemming. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

/**
 * Visitor words that the record spells differently, added to a query (after stemming) so BM25 can
 * meet them. Embeddings cover paraphrase in general; this only bridges the commonest gaps.
 */
const SYNONYMS: Record<string, string[]> = {
  job: ["role"],
  position: ["role"],
  hire: ["role", "open"],
  hir: ["role", "open"],
  mov: ["relocate"],
  move: ["relocate"],
  country: ["relocate"],
  abroad: ["relocate"],
  degree: ["bsc", "university"],
  leadership: ["lead"],
  manag: ["lead"],
  manager: ["lead"],
  cv: ["resume"],
};

/** Each distinct query token with its synonyms: `[["job", "role"], ["remote"]]`. */
export function queryGroups(text: string): string[][] {
  return [...new Set(tokenize(text))].map((t) => [t, ...(SYNONYMS[t] ?? []).map(stem)]);
}
