"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Download, Send } from "@/components/ui/icons";
import { textLinkClass } from "@/components/ui/TextLink";
import type { ContactResponse } from "@/features/contact";
import { showDraft, toast } from "@/features/stage";

// The contact module (zod) loads on the first action, so it never weighs on the first paint
const loadContact = () => import("@/features/contact");

const FIELD_IDS: Record<string, string> = {
  replyTo: "letter-email",
  name: "letter-name",
  company: "letter-company",
  topic: "letter-topic",
  message: "letter-topic",
};

const NAME_HINT = "Add your name so Felistas knows who is writing.";

const fieldClass =
  "mx-1 max-w-full border-b border-acc/40 bg-transparent px-1 font-serif text-acc italic transition-colors placeholder:text-acc/40 focus:border-acc focus:outline-none aria-invalid:border-acc2";

type Letter = { replyTo: string; name: string; company?: string; topic: string; message: string };

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; text: string };

/**
 * A letter with blanks to fill in. "Hand it to Dusk" turns it into a draft in the conversation;
 * "Send via email" sends it straight to Felistas's inbox, and the visitor gets a confirmation
 * (UI-SPEC §8). Both check the letter with the same rules as the server first.
 */
export function ContactLetter({
  recipient,
  resume,
}: {
  recipient: string;
  /** The resume download, when it is published */
  resume: { href: string; file: string } | null;
}) {
  const empty = { name: "", company: "", topic: "", email: "", website: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<{ text: string; field: string } | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // When the letter appeared: the server's time trap expects a real person's pace
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = performance.now();
  }, []);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (status.kind === "sent") setStatus({ kind: "idle" });
  };

  const fail = (text: string, field: string) => {
    setError({ text, field });
    document.getElementById(FIELD_IDS[field] ?? "letter-email")?.focus();
  };

  /** The same rules the server applies, so a checked letter can always be sent. */
  const check = async (): Promise<Letter | null> => {
    if (!form.name.trim()) {
      fail(NAME_HINT, "name");
      return null;
    }
    const { contactSchema } = await loadContact();
    const checked = contactSchema
      .pick({ replyTo: true, name: true, company: true, topic: true })
      .safeParse({
        replyTo: form.email.trim(),
        name: form.name,
        company: form.company,
        topic: form.topic,
      });
    if (!checked.success) {
      const issue = checked.error.issues[0];
      fail(issue?.message ?? "Check the letter.", String(issue?.path[0] ?? "replyTo"));
      return null;
    }
    setError(null);
    const { replyTo, company } = checked.data;
    const name = checked.data.name ?? form.name.trim();
    const topic = checked.data.topic ?? "working together";
    return {
      replyTo,
      name,
      company,
      topic,
      message: `Hi ${recipient}, I'm ${name}${company ? ` from ${company}` : ""}. I'd like to talk about ${topic}.`,
    };
  };

  const handToDusk = async (e: FormEvent) => {
    e.preventDefault();
    const letter = await check();
    if (letter) showDraft({ ...letter, website: form.website });
  };

  const sendDirect = async () => {
    if (status.kind === "sending") return;
    const letter = await check();
    if (!letter) return;
    setStatus({ kind: "sending" });
    const { CONTACT_ERRORS } = await loadContact();
    let body: ContactResponse | null = null;
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...letter,
          website: form.website,
          elapsedMs: Math.round(performance.now() - openedAt.current),
        }),
      });
      body = (await res.json()) as ContactResponse;
    } catch {
      body = null;
    }

    if (body?.ok) {
      const text = body.confirmed
        ? `Sent to ${recipient}. A confirmation is on its way to ${letter.replyTo}.`
        : `Sent to ${recipient}. They will reply to ${letter.replyTo}.`;
      setStatus({ kind: "sent", text });
      setForm(empty);
      toast(text);
      return;
    }
    setStatus({ kind: "idle" });
    const message = body && !body.ok ? body.message : CONTACT_ERRORS.send_failed;
    const field = body && !body.ok && body.fields ? Object.keys(body.fields)[0] : undefined;
    fail(field && body && !body.ok ? body.fields![field] : message, field ?? "replyTo");
    toast(message);
  };

  const invalid = (field: string) => error?.field === field || undefined;
  const sending = status.kind === "sending";

  return (
    <form onSubmit={handToDusk} noValidate className="mt-[clamp(18px,2.6vh,30px)]">
      <p className="max-w-[30ch] font-serif text-[clamp(24px,2.6vw,40px)] leading-[1.5] [@media(max-height:820px)]:text-[clamp(22px,2.2vw,32px)]">
        Hi {recipient}, I&apos;m
        <input
          id="letter-name"
          aria-label="Your name"
          aria-invalid={invalid("name")}
          aria-describedby="letter-error"
          placeholder="your name"
          size={9}
          maxLength={80}
          value={form.name}
          onChange={set("name")}
          autoComplete="name"
          className={fieldClass}
        />
        from
        <input
          id="letter-company"
          aria-label="Company"
          aria-invalid={invalid("company")}
          placeholder="company"
          size={8}
          maxLength={80}
          value={form.company}
          onChange={set("company")}
          autoComplete="organization"
          className={fieldClass}
        />
        . I&apos;d like to talk about
        <input
          id="letter-topic"
          aria-label="Topic"
          aria-invalid={invalid("topic")}
          placeholder="a role, a project…"
          size={14}
          maxLength={160}
          value={form.topic}
          onChange={set("topic")}
          className={fieldClass}
        />
        . You can reach me at
        <input
          id="letter-email"
          type="email"
          aria-label="Your email"
          aria-invalid={invalid("replyTo")}
          aria-describedby="letter-error"
          placeholder="you@company.com"
          size={15}
          maxLength={254}
          value={form.email}
          onChange={set("email")}
          autoComplete="email"
          className={fieldClass}
        />
        .
      </p>
      {/* Honeypot: hidden from people, filled in by bots */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={form.website}
        onChange={set("website")}
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />
      <p id="letter-error" role="alert" className="mt-2 min-h-[1.4em] font-mono text-xs text-acc2">
        {error?.text}
      </p>
      <p role="status" className="sr-only">
        {sending ? "Sending your message…" : status.kind === "sent" ? status.text : ""}
      </p>

      <div className="flex flex-wrap items-center gap-x-7 gap-y-1">
        <button type="submit" className={textLinkClass(true)}>
          Hand it to Dusk
          <ArrowRight />
        </button>
        <button
          type="button"
          onClick={sendDirect}
          disabled={sending}
          aria-busy={sending}
          className={`${textLinkClass(true)} disabled:cursor-default disabled:opacity-60`}
        >
          {sending ? "Sending…" : status.kind === "sent" ? "Sent" : "Send via email"}
          <Send />
        </button>
        {resume ? (
          <a href={resume.href} download={resume.file} className={textLinkClass()}>
            Download resume
            <Download />
          </a>
        ) : null}
      </div>
    </form>
  );
}
