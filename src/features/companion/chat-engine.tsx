"use client";

// The real conversation runtime (AI SDK + tool schemas). Loaded on demand by Companion, so the first
// paint doesn't wait for it; it renders nothing and reports the chat state up.
import type { ChatStatus } from "ai";
import { memo, useEffect, useRef } from "react";
import type { DuskUIMessage } from "@/features/agent";
import type { CompanionConfig } from "./config";
import { useDuskChat } from "./use-dusk-chat";

/** What the companion's UI needs from a conversation. */
export type DuskChat = {
  messages: DuskUIMessage[];
  status: ChatStatus;
  error: Error | undefined;
  send: (text: string) => void;
  reset: () => void;
};

type ChatEngineProps = {
  config: CompanionConfig;
  /** Messages the visitor sent before the runtime arrived; sent once, on mount */
  queued: string[];
  onChange: (chat: DuskChat) => void;
};

function ChatEngine({ config, queued, onChange }: ChatEngineProps) {
  const chat = useDuskChat(config);
  const { messages, status, error, sendMessage, reset } = chat;

  const flushed = useRef(false);
  useEffect(() => {
    if (flushed.current) return;
    flushed.current = true;
    for (const text of queued) void sendMessage({ text });
  }, [queued, sendMessage]);

  const resetRef = useRef(reset);
  useEffect(() => {
    resetRef.current = reset;
  }, [reset]);

  useEffect(() => {
    onChange({
      messages,
      status,
      error,
      send: (text) => void sendMessage({ text }),
      reset: () => resetRef.current(),
    });
  }, [messages, status, error, sendMessage, onChange]);

  return null;
}

// Memoised: the parent re-renders on every report, and that must not re-render the engine
export default memo(ChatEngine);
