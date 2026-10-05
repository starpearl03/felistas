"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef } from "react";
import type { DuskUIMessage, PageContext } from "@/features/agent";
import { clearDraft, stageStore, useStage } from "@/features/stage";
import { type CompanionConfig, greetingMessage } from "./config";
import { runTool } from "./run-tool";

/** Must match HISTORY in the chat handler. */
const HISTORY = 12;

const pageContext = (): PageContext => {
  const { section, projectId, roleSlug } = stageStore.get();
  return { section, projectId, roleSlug };
};

/** The Dusk conversation: useChat wired to the page context and the command bus. */
export function useDuskChat(config: CompanionConfig) {
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<DuskUIMessage>({
        api: "/api/chat",
        // Only the recent turns go up: the server reads no more than the last 12 anyway
        prepareSendMessagesRequest: ({ id, messages, trigger, messageId }) => ({
          body: {
            id,
            trigger,
            messageId,
            messages: messages.slice(-HISTORY),
            pageContext: pageContext(),
          },
        }),
      }),
    [],
  );

  const chat = useChat<DuskUIMessage>({
    messages: [greetingMessage(config)],
    transport,
    // The server answers every tool call in the same reply; the page only mirrors each one as it
    // streams in, so nothing is sent back and one question is one request
    onToolCall: ({ toolCall }) => {
      if (toolCall.dynamic) return;
      runTool(toolCall.toolName, toolCall.input, configRef.current);
    },
  });

  // Questions asked from elsewhere on the page ("Ask Dusk about Atlas")
  const ask = useStage((s) => s.ask);
  const handledAsk = useRef(0);
  const { sendMessage, status } = chat;
  useEffect(() => {
    if (!ask || ask.id === handledAsk.current || status === "submitted" || status === "streaming") {
      return;
    }
    handledAsk.current = ask.id;
    void sendMessage({ text: ask.text });
  }, [ask, sendMessage, status]);

  const reset = () => {
    chat.stop();
    clearDraft();
    chat.setMessages([greetingMessage(configRef.current)]);
    chat.clearError();
  };

  return { ...chat, reset };
}
