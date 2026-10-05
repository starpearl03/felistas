// Numbered sources for the model, and the filter that takes its [S2] markers out of the visible text.
import type { Chunk } from "./rag/types";
import type { Source } from "./types";

export type NumberedSource = Source & { n: number; header: string; text: string };

export function numberSources(chunks: Chunk[], first = 1): NumberedSource[] {
  return chunks.map((c, i) => ({
    n: first + i,
    id: c.id,
    title: c.title,
    section: c.section,
    entityId: c.entityId,
    header: c.header,
    text: c.text,
  }));
}

/** "[S1] header\ntext", blank-line separated, as the model reads them. */
export const formatSources = (sources: NumberedSource[]): string =>
  sources.map((s) => `[S${s.n}] ${s.header}\n${s.text}`).join("\n\n");

/** What the client needs: no numbers, no text. Duplicates (two chunks of one entity) collapse. */
export function citedSources(sources: NumberedSource[], cited: Iterable<number>): Source[] {
  const wanted = new Set(cited);
  const out: Source[] = [];
  for (const s of sources) {
    if (!wanted.has(s.n) || out.some((o) => o.title === s.title)) continue;
    out.push({ id: s.id, title: s.title, section: s.section, entityId: s.entityId });
  }
  return out;
}

/** "[S1]", "[S1, S3]" and "[S1][S2]", with the space before them */
const MARKER = /\s*\[(S\d+(?:\s*,\s*S\d+)*)\]/g;
/** A tail that could still become a marker once the next delta arrives */
const OPEN_TAIL = /\s*\[(?:S\d*(?:\s*,\s*(?:S\d*)?)*)?$/;
const MAX_MARKER = 40;

/**
 * Strips citation markers from streamed text, even when one is split across deltas, and records the
 * numbers it saw. Push each delta, then flush when the text part ends.
 */
export function createCitationFilter(onCite: (n: number) => void) {
  let pending = "";
  const clean = (s: string) =>
    s.replace(MARKER, (_, ids: string) => {
      for (const id of ids.split(",")) onCite(Number(id.trim().slice(1)));
      return "";
    });

  return {
    push(delta: string): string {
      const text = pending + delta;
      const open = OPEN_TAIL.exec(text);
      // Hold back a possible marker, or trailing space that a marker might follow
      let cut = text.length;
      if (open && text.length - open.index <= MAX_MARKER) cut = open.index;
      else {
        const space = /\s+$/.exec(text);
        if (space) cut = space.index;
      }
      pending = text.slice(cut);
      return clean(text.slice(0, cut));
    },
    flush(): string {
      const rest = clean(pending);
      pending = "";
      return rest;
    },
  };
}
