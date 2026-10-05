/** The usual Reciprocal Rank Fusion constant; it damps the weight of the very top ranks. */
export const RRF_K = 60;

/** Reciprocal Rank Fusion: each ranked list adds 1 / (k + rank) to every id it contains. */
export function rrf(lists: string[][], k = RRF_K): Map<string, number> {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, i) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1)));
  }
  return scores;
}
