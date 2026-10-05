"use client";

import { type FormEvent, useState } from "react";
import { ArrowRight } from "@/components/ui/icons";
import { textLinkClass } from "@/components/ui/TextLink";
import { contactSchema } from "@/features/contact";
import { showDraft } from "@/features/stage";

const fieldClass =
  "mx-1 max-w-full border-b border-acc/40 bg-transparent px-1 font-serif text-acc italic transition-colors placeholder:text-acc/40 focus:border-acc focus:outline-none";

/**
 * A letter with blanks to fill in. "Hand it to Dusk" turns it into a draft in the conversation,
 * ready to send (UI-SPEC §8). Nothing is sent from here.
 */
export function ContactLetter({ recipient }: { recipient: string }) {
  const [form, setForm] = useState({ name: "", company: "", topic: "", email: "", website: "" });
  const [error, setError] = useState("");

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const email = contactSchema.shape.replyTo.safeParse(form.email.trim());
    if (!email.success) {
      setError(email.error.issues[0]?.message ?? "Add an email address.");
      document.getElementById("letter-email")?.focus();
      return;
    }
    setError("");
    const name = form.name.trim();
    const company = form.company.trim();
    const topic = form.topic.trim() || "working together";
    showDraft({
      replyTo: email.data,
      name: name || undefined,
      company: company || undefined,
      topic,
      message: `Hi ${recipient}, I'm ${name || "someone"}${company ? ` from ${company}` : ""}. I'd like to talk about ${topic}.`,
      website: form.website,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="mt-[30px]">
      <p className="max-w-[30ch] font-serif text-[clamp(26px,2.9vw,44px)] leading-[1.5]">
        Hi {recipient}, I&apos;m
        <input
          id="letter-name"
          aria-label="Your name"
          placeholder="your name"
          size={9}
          value={form.name}
          onChange={set("name")}
          autoComplete="name"
          className={fieldClass}
        />
        from
        <input
          id="letter-company"
          aria-label="Company"
          placeholder="company"
          size={8}
          value={form.company}
          onChange={set("company")}
          autoComplete="organization"
          className={fieldClass}
        />
        . I&apos;d like to talk about
        <input
          id="letter-topic"
          aria-label="Topic"
          placeholder="a role, a project…"
          size={14}
          value={form.topic}
          onChange={set("topic")}
          className={fieldClass}
        />
        . You can reach me at
        <input
          id="letter-email"
          type="email"
          aria-label="Your email"
          aria-invalid={!!error}
          aria-describedby="letter-error"
          placeholder="you@company.com"
          size={15}
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
      <p
        id="letter-error"
        role="alert"
        className="mt-2.5 min-h-[1.4em] font-mono text-xs text-acc2"
      >
        {error}
      </p>
      <button type="submit" className={textLinkClass(true)}>
        Hand it to Dusk
        <ArrowRight />
      </button>
    </form>
  );
}
