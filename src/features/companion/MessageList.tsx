"use client";

import { useEffect, useRef } from "react";
import type { AnyToolName, DuskUIMessage } from "@/features/agent";
import { useStage } from "@/features/stage";
import type { CompanionConfig } from "./config";
import { ResumeCard } from "./parts/ResumeCard";
import { RevealText } from "./parts/RevealText";
import { SourceChips } from "./parts/SourceChips";
import { ToolLine } from "./parts/ToolLine";

type MessageListProps = {
  messages: DuskUIMessage[];
  thinking: boolean;
  config: CompanionConfig;
  /** id of the reply being spoken; it reveals word by word */
  speakingId: string | null;
  /** The spoken reply is still streaming or revealing; its sources wait until it settles */
  settling: boolean;
  onRevealingChange: (revealing: boolean) => void;
};

const TOOL_PREFIX = "tool-";

export function MessageList({
  messages,
  thinking,
  config,
  speakingId,
  settling,
  onRevealingChange,
}: MessageListProps) {
  const log = useRef<HTMLDivElement>(null);
  const still = useStage((s) => s.motion === "still");

  // Keep the newest words in view; scroll only the log, never the page
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  return (
    <div
      ref={log}
      role="log"
      aria-live="polite"
      // focusable, so keyboard users can scroll back through the conversation
      tabIndex={0}
      aria-label="Conversation with Dusk"
      className="scrollbar-none flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto [mask-image:linear-gradient(transparent,var(--bg)_28px)] px-1 pt-[18px] pb-2.5"
    >
      {messages.map((m) =>
        m.role === "user" ? (
          <p
            key={m.id}
            className="max-w-[86%] self-end rounded-[16px_16px_5px_16px] bg-acc/13 px-[13px] py-[9px] text-[13.5px] leading-normal [overflow-wrap:anywhere]"
          >
            {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
          </p>
        ) : (
          <AssistantMessage
            key={m.id}
            message={m}
            config={config}
            animate={m.id === speakingId && !still}
            settled={!(m.id === speakingId && settling)}
            onRevealingChange={m.id === speakingId ? onRevealingChange : undefined}
          />
        ),
      )}
      {thinking ? (
        <div aria-label="Dusk is thinking" className="flex gap-[5px] py-1.5">
          {[0, 1, 2].map((i) => (
            <i
              key={i}
              className="size-1.5 animate-pulse-soft rounded-full bg-muted motion-reduce:animate-none"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: "1s" }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * One reply, in the prototype's order: what Dusk did (tool lines), what it says (text), then anything
 * it hands over (the resume card). The stream sends tools first so the page moves straight away.
 */
function AssistantMessage({
  message,
  config,
  animate,
  settled,
  onRevealingChange,
}: {
  message: DuskUIMessage;
  config: CompanionConfig;
  animate: boolean;
  settled: boolean;
  onRevealingChange?: (revealing: boolean) => void;
}) {
  const tools: { id: string; name: AnyToolName; input: unknown; ok?: boolean }[] = [];
  const texts: string[] = [];
  for (const part of message.parts) {
    if (part.type === "text") texts.push(part.text);
    else if (part.type.startsWith(TOOL_PREFIX) && "toolCallId" in part) {
      tools.push({
        id: part.toolCallId,
        name: part.type.slice(TOOL_PREFIX.length) as AnyToolName,
        input: part.input,
        ok:
          part.state === "output-available"
            ? ((part.output as { ok?: boolean }).ok ?? true)
            : part.state === "output-error"
              ? false
              : undefined,
      });
    }
  }
  const resume = tools.some((t) => t.name === "download_resume" && t.ok);

  return (
    <div className="flex flex-col gap-2.5">
      {tools.map((t) => (
        <ToolLine key={t.id} name={t.name} input={t.input} ok={t.ok} />
      ))}
      {texts.length ? (
        <RevealText text={texts.join("")} animate={animate} onRevealingChange={onRevealingChange} />
      ) : null}
      {resume ? <ResumeCard resume={config.resume} /> : null}
      {settled && message.metadata?.sources?.length ? (
        <SourceChips sources={message.metadata.sources} config={config} />
      ) : null}
    </div>
  );
}
