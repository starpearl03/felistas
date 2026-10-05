"use client";

import { useState } from "react";
import { CONTACT_ERRORS, type ContactResponse } from "@/features/contact";
import { clearDraft, type Draft, toast } from "@/features/stage";

type SendState =
  | { kind: "idle" }
  | { kind: "editing" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

const linkClass =
  "cursor-pointer font-mono text-xs tracking-[.12em] uppercase underline decoration-current/35 underline-offset-[6px] transition-colors hover:decoration-current disabled:cursor-default disabled:opacity-50";

/**
 * The message the visitor is about to send. Sending happens only here, on the visitor's click:
 * Dusk can draft, never send (UI-SPEC §6.1).
 */
export function DraftCard({ draft, recipient }: { draft: Draft; recipient: string }) {
  const [state, setState] = useState<SendState>({ kind: "idle" });
  const [message, setMessage] = useState(draft.message);

  const send = async () => {
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          replyTo: draft.replyTo,
          name: draft.name,
          company: draft.company,
          topic: draft.topic,
          message,
          website: draft.website ?? "",
          // how long the page has been open, measured by the browser (the time trap)
          elapsedMs: Math.round(performance.now()),
        }),
      });
      const body = (await res.json().catch(() => null)) as ContactResponse | null;
      if (res.ok && body?.ok) {
        setState({ kind: "sent" });
        toast(`Sent. ${recipient} will reply to ${draft.replyTo}.`);
        return;
      }
      setState({
        kind: "error",
        message: body && !body.ok ? body.message : CONTACT_ERRORS.send_failed,
      });
    } catch {
      setState({ kind: "error", message: CONTACT_ERRORS.send_failed });
    }
  };

  const cancel = () => {
    clearDraft();
    toast("Discarded. Nothing was sent.");
  };

  if (state.kind === "sent") {
    return (
      <div role="status" className="border-l border-acc py-2 pl-3.5 text-[13px] text-fg2">
        Sent to {recipient}. A reply will come to {draft.replyTo}.{" "}
        <button type="button" onClick={clearDraft} className={linkClass}>
          Close
        </button>
      </div>
    );
  }

  const busy = state.kind === "sending";

  return (
    <section aria-label="Draft message" className="grid gap-2.5 border-l border-acc py-3 pl-3.5">
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        <dt className="pt-0.5 font-mono text-[10.5px] tracking-[.08em] text-muted uppercase">To</dt>
        <dd className="m-0">{recipient}</dd>
        <dt className="pt-0.5 font-mono text-[10.5px] tracking-[.08em] text-muted uppercase">
          Reply to
        </dt>
        <dd className="m-0 [overflow-wrap:anywhere]">{draft.replyTo}</dd>
        <dt className="pt-0.5 font-mono text-[10.5px] tracking-[.08em] text-muted uppercase">
          Message
        </dt>
        <dd className="m-0 [overflow-wrap:anywhere]">
          {state.kind === "editing" ? (
            <textarea
              aria-label="Edit the message"
              value={message}
              maxLength={2000}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full resize-y border-b border-acc/40 bg-transparent text-[13px] leading-normal focus:border-acc focus:outline-none"
            />
          ) : (
            <span className="whitespace-pre-wrap">{message}</span>
          )}
        </dd>
      </dl>

      {state.kind === "error" ? (
        <p role="alert" className="font-mono text-xs text-acc2">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-[18px]">
        <button
          type="button"
          onClick={send}
          disabled={busy || !message.trim()}
          className={`${linkClass} text-acc`}
        >
          {busy ? "Sending…" : "Send"}
        </button>
        {state.kind === "editing" ? (
          <button type="button" onClick={() => setState({ kind: "idle" })} className={linkClass}>
            Done
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setState({ kind: "editing" })}
            disabled={busy}
            className={linkClass}
          >
            Edit
          </button>
        )}
        <button type="button" onClick={cancel} disabled={busy} className={linkClass}>
          Cancel
        </button>
      </div>
    </section>
  );
}
