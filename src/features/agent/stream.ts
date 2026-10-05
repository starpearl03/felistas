import "server-only";

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  type UIMessageStreamWriter,
} from "ai";
import type { AgentReply } from "./offline-agent";
import type { DuskUIMessage } from "./types";

/**
 * Writes an offline reply as a UI message, in the same shape a model's reply has: tool calls with
 * their results first (so the page starts moving), then the text in word-sized deltas. The client
 * can't tell the two apart except for `metadata.mode`.
 */
export function writeReply(
  writer: UIMessageStreamWriter<DuskUIMessage>,
  reply: AgentReply,
  mode: "offline" | "live" = "offline",
) {
  writer.write({ type: "start", messageMetadata: { mode } });
  for (const call of reply.tools) {
    const toolCallId = generateId();
    writer.write({
      type: "tool-input-available",
      toolCallId,
      toolName: call.name,
      input: call.input,
    });
    writer.write({ type: "tool-output-available", toolCallId, output: { ok: true } });
  }
  const id = generateId();
  writer.write({ type: "text-start", id });
  for (const word of reply.text.match(/\S+\s*/g) ?? []) {
    writer.write({ type: "text-delta", id, delta: word });
  }
  writer.write({ type: "text-end", id });
  writer.write({
    type: "finish",
    messageMetadata: { mode, chips: reply.chips, flow: reply.flow },
  });
}

export function replyResponse(reply: AgentReply, mode: "offline" | "live" = "offline"): Response {
  const stream = createUIMessageStream<DuskUIMessage>({
    execute: ({ writer }) => writeReply(writer, reply, mode),
  });
  return createUIMessageStreamResponse({ stream });
}
