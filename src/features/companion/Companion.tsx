"use client";

import { type FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Toast } from "@/components/ui/Toast";
import type { DuskUIMessage } from "@/features/agent";
import { closeChat, openChat, setVoice, stageStore, useStage } from "@/features/stage";
import { cn } from "@/lib/cn";
import type { DuskChat } from "./chat-engine";
import { type CompanionConfig, GREETING_ID, greetingMessage } from "./config";
import { MessageList } from "./MessageList";
import { isPhone } from "./phone";
import { suggestions } from "./suggest";

// The chat runtime (AI SDK and tool schemas) and the draft card load when first needed, so they
// never delay the first paint
const ChatEngine = lazy(() => import("./chat-engine"));
const DraftCard = lazy(() => import("./DraftCard").then((m) => ({ default: m.DraftCard })));

/** Loads the runtime once the page has settled, so it is usually ready before the first question */
const IDLE_PRELOAD_MS = 2_500;

const STATUS = { idle: "Listening", think: "Thinking", speak: "Responding" } as const;

const icon = "size-[15px]";

/** A light tap under the finger, on phones that support it */
const buzz = () => {
  try {
    if (isPhone()) navigator.vibrate?.(8);
  } catch {
    // vibration can be blocked by the browser; it is only a nicety
  }
};

/**
 * Dusk's conversation. On desktop it fills the column under the docked sphere, with no panel or
 * divider (only a fade). Below 900px it is a bottom sheet the sphere docks into (UI-SPEC §6, §9).
 */
export function Companion({ config }: { config: CompanionConfig }) {
  const chat = useLazyChat(config);
  const { messages, status, error } = chat;
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
  const asked = messages.filter((m) => m.role === "user").map(textOf);
  const chips = busy || revealing ? [] : suggestions(lastAssistant, asked, config);
  // Before the first question, the phone chat lists the suggestions as questions to tap
  const starting = !asked.length && !busy;
  const preview = lastAssistant ? textOf(lastAssistant) : "";

  // The sphere shows what Dusk is doing: thinking while waiting, speaking while the words appear
  useEffect(() => {
    setVoice(status === "submitted" ? "think" : busy || revealing ? "speak" : "idle");
  }, [status, busy, revealing]);
  useEffect(() => () => setVoice("idle"), []);

  const onRevealingChange = useCallback((r: boolean) => setRevealing(r), []);

  const send = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    buzz();
    setInput("");
    chat.send(value);
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
        "group/companion z-5 box-border flex flex-col",
        // phones: the conversation fills the screen (chat first); folded, it is a bar over the page
        "fixed inset-x-0 bottom-0 h-[184px] rounded-t-[18px] px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom,0px))] transition-[height] duration-400 ease-[cubic-bezier(.2,.7,.1,1)] motion-reduce:transition-none max-desk:bg-[linear-gradient(0deg,rgba(var(--bg-rgb),.97)_78%,rgba(var(--bg-rgb),0))]",
        "data-open:h-dvh max-desk:data-open:rounded-none max-desk:data-open:bg-[linear-gradient(0deg,rgba(var(--bg-rgb),.9),rgba(var(--bg-rgb),.55)_70%)] max-desk:data-open:pt-[calc(56px+env(safe-area-inset-top,0px))]",
        // desktop: the column under the sphere, no panel or divider
        "desk:absolute desk:inset-y-0 desk:right-auto desk:left-0 desk:h-auto! desk:w-(--col) desk:rounded-none desk:pt-[var(--lift,60vh)] desk:pr-[clamp(18px,2.2vw,30px)] desk:pb-[18px] desk:pl-[clamp(18px,2.2vw,30px)] desk:column-fade",
      )}
    >
      <header
        className={cn(
          "relative flex items-center gap-3 pb-1.5 desk:justify-center desk:text-center",
          "max-desk:group-data-open/companion:flex-col max-desk:group-data-open/companion:gap-1 max-desk:group-data-open/companion:text-center",
        )}
      >
        {/* Phones: the sphere docks into this slot, a large orb while the chat fills the screen.
            Tapping it is like tapping the composer. */}
        <div
          data-sphere-slot
          aria-hidden
          onClick={() => document.querySelector<HTMLInputElement>("#dusk-input")?.focus()}
          className={cn(
            "size-10 flex-none transition-[width,height] duration-400 ease-[cubic-bezier(.2,.7,.1,1)] motion-reduce:transition-none desk:hidden",
            "max-desk:group-data-open/companion:size-[clamp(112px,23svh,196px)]",
          )}
        />
        <div
          className={cn(
            "min-w-0 flex-1 desk:flex-none",
            "max-desk:group-data-open/companion:flex-none",
          )}
        >
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
        <div
          className={cn(
            "flex gap-1 desk:absolute desk:top-0 desk:right-[-6px]",
            "max-desk:group-data-open/companion:absolute max-desk:group-data-open/companion:top-0 max-desk:group-data-open/companion:right-[-6px]",
          )}
        >
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
          {open ? (
            <button
              type="button"
              onClick={closeChat}
              aria-label="Browse the page"
              className="flex h-[30px] cursor-pointer items-center gap-1.5 rounded-lg px-2 font-mono text-[10.5px] tracking-[.12em] text-muted uppercase hover:bg-soft hover:text-fg active:scale-95 desk:hidden"
            >
              Browse
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="size-3"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={openChat}
              aria-label="Open the conversation"
              className="grid size-[30px] cursor-pointer place-items-center rounded-lg text-muted hover:bg-soft hover:text-fg active:scale-95 desk:hidden"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className={icon}
              >
                <path d="M4 10l4-4 4 4" />
              </svg>
            </button>
          )}
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
          settling={busy || revealing}
          onRevealingChange={onRevealingChange}
        />

        {error ? (
          <p role="alert" className="pb-2 font-mono text-xs text-acc2">
            Dusk couldn&apos;t answer just now. Try again in a moment.
          </p>
        ) : null}

        {draft ? (
          <Suspense fallback={null}>
            <DraftCard key={draft.id} draft={draft} recipient={config.name} />
          </Suspense>
        ) : null}

        {chips.length && starting ? (
          // Phones, first step: the suggestions as a ruled list of questions to tap
          <div className={cn("hidden pb-3", "max-desk:group-data-open/companion:grid")}>
            <p className="pb-1.5 font-mono text-[10.5px] tracking-[.12em] text-muted uppercase">
              Try asking
            </p>
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => send(c)}
                className="flex cursor-pointer items-center justify-between gap-3 border-t border-line py-3 text-left font-serif text-[19px] leading-tight transition-transform last:border-b active:scale-[.98]"
              >
                {c}
                <span aria-hidden className="font-mono text-sm text-acc">
                  {"\u2192"}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {chips.length ? (
          <div
            className={cn(
              "flex flex-wrap gap-1.5 pt-0.5 pb-3",
              // phones: one row that swipes sideways
              "max-desk:-mx-4 max-desk:scrollbar-none max-desk:snap-x max-desk:flex-nowrap max-desk:overflow-x-auto max-desk:px-4",
              starting && "max-desk:group-data-open/companion:hidden",
            )}
          >
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => send(c)}
                className="flex-none cursor-pointer snap-start rounded-full bg-acc/7 px-[11px] py-1.5 text-[12.5px] text-fg2 transition-[color,background-color,scale] hover:bg-acc/18 hover:text-fg active:scale-95 max-desk:py-2 max-desk:text-[13.5px]"
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
            chat.wake();
            if (!stageStore.get().chatOpen) openChat();
          }}
          onClick={() => {
            if (!stageStore.get().chatOpen) openChat();
          }}
          maxLength={1000}
          autoComplete="off"
          enterKeyHint="send"
          placeholder={`Ask Dusk about ${config.name}…`}
          // 16px on phones, so focusing it never zooms the page
          className="min-w-0 flex-1 bg-transparent py-2.5 text-base placeholder:text-muted focus:outline-none focus-visible:outline-none desk:text-[15px]"
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
        <span>
          {lastAssistant?.metadata?.mode === "live" ? "Gemini, free tier" : "Offline mode"}
        </span>
      </p>
      <Toast />
      {chat.engine}
    </aside>
  );
}

/**
 * The conversation, with its runtime loaded on demand. Until it arrives, Dusk shows the greeting from
 * content; a message sent in the meantime is queued and shows as "thinking". The UI around it never
 * remounts, so focus and typed text survive the hand-over.
 */
function useLazyChat(config: CompanionConfig) {
  const greeting = useMemo(() => greetingMessage(config), [config]);
  const [woken, setAwake] = useState(false);
  const [queued, setQueued] = useState<string[]>([]);
  const [live, setLive] = useState<DuskChat | null>(null);
  const wake = useCallback(() => setAwake(true), []);

  // Awake once asked anything, including an "Ask Dusk" link elsewhere on the page (the runtime
  // reads that question itself), or once the page has settled
  const asked = useStage((s) => s.ask !== null);
  const awake = woken || asked;
  useEffect(() => {
    const timer = setTimeout(() => setAwake(true), IDLE_PRELOAD_MS);
    return () => clearTimeout(timer);
  }, []);

  const waiting: DuskUIMessage[] = queued.map((text, i) => ({
    id: `queued-${i}`,
    role: "user",
    parts: [{ type: "text", text }],
  }));

  const chat: DuskChat = live ?? {
    messages: [greeting, ...waiting],
    status: queued.length ? "submitted" : "ready",
    error: undefined,
    send: (text) => {
      setQueued((q) => [...q, text]);
      setAwake(true);
    },
    reset: () => setQueued([]),
  };

  const engine = awake ? (
    <Suspense fallback={null}>
      <ChatEngine config={config} queued={queued} onChange={setLive} />
    </Suspense>
  ) : null;

  return { ...chat, wake, engine };
}

const textOf = (m: DuskUIMessage) =>
  m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .trim();
