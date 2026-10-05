import "server-only";

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  type LanguageModel,
  stepCountIs,
  streamText,
  toUIMessageStream,
  tool,
  type UIMessage,
  type UIMessageChunk,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";
import {
  citedSources,
  createCitationFilter,
  type NumberedSource,
  numberSources,
} from "./citations";
import type { AgentReply } from "./offline-agent";
import { retrieve } from "./rag/retrieve";
import type { RagIndex } from "./rag/types";
import type { AgentRecord } from "./record";
import { writeReply } from "./stream";
import { buildSystemPrompt } from "./system-prompt";
import {
  SEARCH_DESCRIPTION,
  TOOL_DESCRIPTIONS,
  type ToolName,
  type ToolResult,
  toolInputSchemas,
} from "./tools";
import type { DuskUIMessage, PageContext } from "./types";

/** Model calls per reply: page tools and searches, then the answer */
export const MAX_STEPS = 4;
/** More sources a follow-up search adds */
const SEARCH_HITS = 4;

export type LiveInput = {
  model: LanguageModel;
  /** Recent turns, already validated and trimmed */
  messages: { role: "user" | "assistant" | "system"; parts: unknown[] }[];
  question: string;
  context: PageContext | null;
  record: AgentRecord;
  index: RagIndex;
  embedQuery?: (query: string) => Promise<number[]>;
  /** The offline answer, used when the model fails before it says anything */
  fallback: () => AgentReply;
  /** Told about a model failure, e.g. to pause live answers after a 429 */
  onModelError?: (error: unknown) => void;
  abortSignal?: AbortSignal;
};

function pageTools(record: AgentRecord) {
  const schemas = toolInputSchemas({
    projects: record.projects.map((p) => p.id) as [string, ...string[]],
    roles: record.roles.map((r) => r.slug) as [string, ...string[]],
  });
  // The server answers each call so the model can carry on in the same request; the client mirrors
  // the call on the command bus as it streams in
  const pageTool = <S extends z.ZodType>(
    name: ToolName,
    inputSchema: S,
    run: () => ToolResult = () => ({ ok: true }),
  ) => tool({ description: TOOL_DESCRIPTIONS[name], inputSchema, execute: async () => run() });
  return {
    navigate: pageTool("navigate", schemas.navigate),
    open_project: pageTool("open_project", schemas.open_project),
    open_role: pageTool("open_role", schemas.open_role),
    download_resume: pageTool("download_resume", schemas.download_resume, () => ({
      ok: record.resumeAvailable,
    })),
    draft_message: pageTool("draft_message", schemas.draft_message),
    set_motion: pageTool("set_motion", schemas.set_motion),
  };
}

/** Chunks that mean the model has started answering (a page tool or words), not just begun a step */
const isOutput = (c: UIMessageChunk) =>
  c.type === "tool-input-start" ||
  c.type === "tool-input-available" ||
  (c.type === "text-delta" && c.delta.trim() !== "");

/**
 * Answers with the model, grounded in retrieved sources: tool calls drive the page, `[Sx]` markers
 * become source chips. If the model fails before its first output (no quota, 429, network), the
 * visitor gets the offline answer instead, in the same stream.
 */
export async function liveResponse(input: LiveInput): Promise<Response> {
  const { record, index, context, question } = input;

  const retrieval = await retrieve(index, question, { context, embedQuery: input.embedQuery });
  const sources: NumberedSource[] = numberSources(retrieval.hits.map((h) => h.chunk));

  const tools = {
    ...pageTools(record),
    search_record: tool({
      description: SEARCH_DESCRIPTION,
      inputSchema: z.object({ query: z.string().trim().min(2).max(200) }),
      execute: async ({ query }) => {
        const more = await retrieve(index, query, { context, embedQuery: input.embedQuery });
        const fresh = more.hits
          .map((h) => h.chunk)
          .filter((c) => !sources.some((s) => s.id === c.id))
          .slice(0, SEARCH_HITS);
        const added = numberSources(fresh, sources.length + 1);
        sources.push(...added);
        return {
          found: added.length,
          sources: added.length
            ? added.map((s) => `[S${s.n}] ${s.header}\n${s.text}`).join("\n\n")
            : "Nothing more in the record.",
        };
      },
    }),
  };

  const stream = createUIMessageStream<DuskUIMessage>({
    execute: async ({ writer }) => {
      const fail = (error: unknown) => input.onModelError?.(error);

      let ui: ReadableStream<UIMessageChunk>;
      try {
        const messages = await convertToModelMessages(
          input.messages.filter((m) => m.role !== "system") as UIMessage[],
          { tools, ignoreIncompleteToolCalls: true },
        );
        const result = streamText({
          model: input.model,
          instructions: buildSystemPrompt({
            record,
            sources: [...sources],
            context,
            lowConfidence: retrieval.lowConfidence,
          }),
          messages,
          tools,
          stopWhen: stepCountIs(MAX_STEPS),
          // One retry for a transient overload ("high demand", 503); then the offline answer
          maxRetries: 1,
          abortSignal: input.abortSignal,
          onError: () => {}, // reported through the UI stream below
        });
        ui = toUIMessageStream({
          stream: result.stream,
          tools,
          sendReasoning: false,
          sendSources: false,
          onError: (error) => {
            fail(error);
            return "The model failed.";
          },
        });
      } catch (error) {
        fail(error);
        writeReply(writer, input.fallback(), "offline");
        return;
      }

      await relay(ui, writer, sources, () => {
        // Nothing reached the visitor yet: answer offline instead
        writeReply(writer, input.fallback(), "offline");
      });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

/**
 * Passes the model's UI chunks to the visitor: holds them until the first real output (so a failure
 * before it can fall back cleanly), strips citation markers, and puts the cited sources in the final
 * metadata.
 */
async function relay(
  ui: ReadableStream<UIMessageChunk>,
  writer: UIMessageStreamWriter<DuskUIMessage>,
  sources: NumberedSource[],
  fallback: () => void,
) {
  const cited = new Set<number>();
  const filters = new Map<string, ReturnType<typeof createCitationFilter>>();
  const held: UIMessageChunk[] = [];
  let started = false;
  let openText: string | null = null;

  const emit = (chunk: UIMessageChunk) => {
    switch (chunk.type) {
      case "start":
        writer.write({ ...chunk, messageMetadata: { mode: "live" } });
        return;
      case "text-start":
        filters.set(
          chunk.id,
          createCitationFilter((n) => cited.add(n)),
        );
        openText = chunk.id;
        writer.write(chunk);
        return;
      case "text-delta": {
        const delta = filters.get(chunk.id)?.push(chunk.delta) ?? chunk.delta;
        if (delta) writer.write({ ...chunk, delta });
        return;
      }
      case "text-end": {
        const rest = filters.get(chunk.id)?.flush();
        if (rest) writer.write({ type: "text-delta", id: chunk.id, delta: rest });
        openText = null;
        writer.write(chunk);
        return;
      }
      case "finish":
        writer.write({
          ...chunk,
          messageMetadata: { mode: "live", flow: null, sources: citedSources(sources, cited) },
        });
        return;
      default:
        writer.write(chunk as Parameters<typeof writer.write>[0]);
    }
  };

  const reader = ui.getReader();
  try {
    for (;;) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      if (!started) {
        if (chunk.type === "error") return fallback();
        held.push(chunk);
        if (!isOutput(chunk)) continue;
        started = true;
        held.splice(0).forEach(emit);
        continue;
      }
      if (chunk.type === "error") {
        // The answer was under way: close it with a plain note rather than an error state
        const id = openText ?? generateId();
        if (!openText) writer.write({ type: "text-start", id });
        writer.write({
          type: "text-delta",
          id,
          delta: " The connection to the model dropped. Ask again in a moment.",
        });
        writer.write({ type: "text-end", id });
        writer.write({
          type: "finish",
          messageMetadata: { mode: "live", flow: null, sources: citedSources(sources, cited) },
        });
        return;
      }
      emit(chunk);
    }
  } finally {
    // Stops the model when the visitor's answer ends early (a fallback or a dropped connection)
    void reader.cancel().catch(() => {});
  }
  if (!started) fallback();
}
