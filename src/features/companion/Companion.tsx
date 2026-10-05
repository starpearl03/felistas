"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Toast } from "@/components/ui/Toast";
import { closeChat, openChat, setVoice, stageStore, useStage } from "@/features/stage";
import { cn } from "@/lib/cn";
import { type CompanionConfig, GREETING_ID } from "./config";
import { DraftCard } from "./DraftCard";
import { MessageList } from "./MessageList";
import { useDuskChat } from "./use-dusk-chat";

const STATUS = { idle: "Listening", think: "Thinking", speak: "Responding" } as const;

const icon = "size-[15px]";

/**
 * Dusk's conversation. On desktop it fills the column under the docked sphere, with no panel or
 * divider (only a fade). Below 900px it is a bottom sheet the sphere docks into (UI-SPEC §6, §9).
 */
export function Companion({ config }: { config: CompanionConfig }) {
  const chat = useDuskChat(config);
  const { messages, status, sendMessage, error } = chat;
  const voice = useStage((s) => s.voice);
  const shape = useStage((s) => s.shape);
  const open = useStage((s) => s.chatOpen);
  const draft = useStage((s) => s.draft);
  const [input, setInput] = useState("");
  const [revealing, setRevealing] = useState(false);

  const busy = status === "submitted" || status === "streaming";
  const last = messages.at(-1);
  const lastAssistant = messages.findLast((m) => m.role === "assistant");
  const speakingId =
    lastAssistant && lastAssistant.id !== GREETING_ID && last?.role === "assistant"
      ? lastAssistant.id
      : null;
  const chips = busy || revealing ? [] : (lastAssistant?.metadata?.chips ?? []);
  const preview = lastAssistant?.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .trim();

  // The sphere shows what Dusk is doing: thinking while waiting, speaking while the words appear
  useEffect(() => {
    setVoice(status === "submitted" ? "think" : busy || revealing ? "speak" : "idle");
  }, [status, busy, revealing]);
  useEffect(() => () => setVoice("idle"), []);

  const onRevealingChange = useCallback((r: boolean) => setRevealing(r), []);

  const send = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    void sendMessage({ text: value });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  // Escape folds the phone sheet away
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stageStore.get().chatOpen) closeChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <aside
      aria-label="Dusk, the portfolio assistant"
      data-open={open || undefined}
      className={cn(
        "z-5 box-border flex flex-col",
        // phones: a bottom sheet, folded to its header until opened
        "fixed inset-x-0 bottom-0 h-[184px] rounded-t-[18px] px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom,0px))] transition-[height] duration-400 ease-[cubic-bezier(.2,.7,.1,1)] data-open:h-[76%] max-desk:bg-[linear-gradient(0deg,rgba(var(--bg-rgb),.97)_78%,rgba(var(--bg-rgb),0))]",
        // desktop: the column under the sphere, no panel or divider
        "desk:absolute desk:inset-y-0 desk:right-auto desk:left-0 desk:h-auto! desk:w-(--col) desk:rounded-none desk:pt-[var(--lift,60vh)] desk:pr-[clamp(18px,2.2vw,30px)] desk:pb-[18px] desk:pl-[clamp(18px,2.2vw,30px)] desk:column-fade",
      )}
    >
      <header className="relative flex items-center gap-3 pb-1.5 desk:justify-center desk:text-center">
        {/* Phones: the sphere docks into this slot */}
        <div data-sphere-slot aria-hidden className="size-10 flex-none desk:hidden" />
        <div className="min-w-0 flex-1 desk:flex-none">
          <b className="block font-serif text-[28px] leading-none font-normal">Dusk</b>
          <span className="mt-1 inline-flex items-center gap-[7px] font-mono text-[10.5px] tracking-[.12em] text-muted uppercase">
            <i
              aria-hidden
              className={cn(
                "size-1.5 rounded-full bg-acc",
                voice === "think" && "animate-pulse-soft [animation-duration:.6s]",
                voice === "speak" && "shadow-[0_0_0_3px_var(--soft)]",
              )}
            />
            <span aria-live="polite">{STATUS[voice]}</span>
          </span>
          <span className="block font-mono text-[10px] tracking-[.12em] text-acc opacity-85">
            form · {shape}
          </span>
        </div>
        <div className="flex gap-1 desk:absolute desk:top-0 desk:right-[-6px]">
          <button
            type="button"
            onClick={chat.reset}
            aria-label="Start over"
            title="Start over"
            className="grid size-[30px] cursor-pointer place-items-center rounded-lg text-muted hover:bg-soft hover:text-fg"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={icon}
            >
              <path d="M3 8a5 5 0 1 0 1.5-3.6M3 2.5v2.5h2.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => (open ? closeChat() : openChat())}
            aria-label={open ? "Fold the conversation away" : "Open the conversation"}
            aria-expanded={open}
            className="grid size-[30px] cursor-pointer place-items-center rounded-lg text-muted hover:bg-soft hover:text-fg desk:hidden"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={cn(icon, "transition-transform", open && "rotate-180")}
            >
              <path d="M4 10l4-4 4 4" />
            </svg>
          </button>
        </div>
      </header>

      {/* Phones, folded: the last thing Dusk said, on one line */}
      <button
        type="button"
        onClick={openChat}
        className={cn(
          "cursor-pointer truncate py-2 text-left font-serif text-base text-fg2 desk:hidden",
          open && "hidden",
        )}
      >
        {preview}
      </button>

      <div className={cn("flex min-h-0 flex-1 flex-col", !open && "max-desk:hidden")}>
        <MessageList
          messages={messages}
          thinking={status === "submitted"}
          config={config}
          speakingId={speakingId}
          onRevealingChange={onRevealingChange}
        />

        {error ? (
          <p role="alert" className="pb-2 font-mono text-xs text-acc2">
            Dusk couldn&apos;t answer just now. Try again in a moment.
          </p>
        ) : null}

        {draft ? <DraftCard key={draft.id} draft={draft} recipient={config.name} /> : null}

        {chips.length ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5 pb-3">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => send(c)}
                className="cursor-pointer rounded-full bg-acc/7 px-[11px] py-1.5 text-[12.5px] text-fg2 transition-colors hover:bg-acc/18 hover:text-fg"
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-b border-acc/30 py-1 pr-1 pl-0.5 transition-colors focus-within:border-acc"
      >
        <label htmlFor="dusk-input" className="sr-only">
          Ask Dusk about {config.name}
        </label>
        <input
          id="dusk-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          // focus opens the sheet; click too, for a composer still focused after the sheet folded
          onFocus={() => {
            if (!stageStore.get().chatOpen) openChat();
          }}
          onClick={() => {
            if (!stageStore.get().chatOpen) openChat();
          }}
          maxLength={1000}
          autoComplete="off"
          placeholder={`Ask Dusk about ${config.name}…`}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] placeholder:text-muted focus:outline-none focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="grid size-[34px] flex-none cursor-pointer place-items-center rounded-full bg-acc text-ink transition-opacity disabled:cursor-default disabled:opacity-50"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className={icon}
          >
            <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
          </svg>
        </button>
      </form>
      <p className="mt-2.5 hidden justify-between gap-2 font-mono text-[10px] tracking-[.06em] text-muted desk:flex">
        <span>Enter to send</span>
        <span>{lastAssistant?.metadata?.mode === "live" ? "Gemini" : "Offline mode"}</span>
      </p>
      <Toast />
    </aside>
  );
}
