"use client";

import { ArrowRight, GitHub, LinkedIn, Mail } from "@/components/ui/icons";
import { TextLink } from "@/components/ui/TextLink";
import type { AnyToolName } from "@/features/agent";
import { PROJECT_STATUS } from "@/features/content";
import { ask, closeChat, openProject, openRole } from "@/features/stage";
import { cn } from "@/lib/cn";
import type { CompanionConfig } from "../config";

// In the phone chat the page sits behind the conversation, so what Dusk opens is shown right in the
// reply (UI-SPEC §9.1). Elsewhere the page itself moves, so these stay hidden. Like the resume card,
// each reply hangs off an accent rule: no boxes.
const inline = cn(
  "hidden gap-2.5 border-l border-acc py-1 pl-3.5",
  "max-desk:group-data-open/companion:grid",
);
const kicker = "font-mono text-[10.5px] tracking-[.12em] text-muted uppercase";
const row =
  "flex w-full cursor-pointer items-baseline justify-between gap-3 border-t border-line py-2.5 text-left transition-transform last:border-b active:scale-[.98]";

/** Leaves the chat for the page, already at what Dusk opened. */
const onPage = (go: () => void) => () => {
  closeChat();
  go();
};

type InlineReplyProps = { name: AnyToolName; input: unknown; config: CompanionConfig };

export function InlineReply({ name, input, config }: InlineReplyProps) {
  const i = (input ?? {}) as Record<string, unknown>;

  if (name === "open_project") {
    const p = config.projects.find((x) => x.id === i.id);
    if (!p) return null;
    return (
      <div className={inline} data-inline="project">
        <p className={kicker}>
          {p.year} · {PROJECT_STATUS[p.status].tag} · {p.kind}
        </p>
        <b className="font-serif text-[28px] leading-none font-normal">{p.name}</b>
        <p className="text-[14px] leading-[1.6] text-fg2">{p.desc}</p>
        <p className="flex items-baseline gap-2.5">
          <span className="font-serif text-[30px] leading-none text-acc">{p.metric}</span>
          <span className={kicker}>{p.metricLabel}</span>
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-fg2">{p.stack.join(" · ")}</p>
        <div className="flex flex-wrap gap-x-5">
          {p.url ? (
            <TextLink href={p.url} target="_blank" rel="noreferrer" accent icon={<ArrowRight />}>
              Visit
            </TextLink>
          ) : null}
          <TextLink icon={<ArrowRight />} onClick={onPage(() => openProject(p.id, p.name))}>
            See it on the page
          </TextLink>
        </div>
      </div>
    );
  }

  if (name === "open_role") {
    const r = config.roles.find((x) => x.slug === i.role);
    if (!r) return null;
    return (
      <div className={inline} data-inline="role">
        <p className={kicker}>
          {r.period}
          {r.current ? " · current" : ""}
        </p>
        <b className="font-serif text-[26px] leading-[1.05] font-normal">{r.role}</b>
        <p className="font-mono text-xs text-acc">{r.org}</p>
        <ul className="m-0 grid list-none gap-2 p-0">
          {r.points.slice(0, 3).map((pt) => (
            <li
              key={pt}
              className="grid grid-cols-[18px_1fr] text-[14px] leading-[1.5] text-fg2 before:mt-[7px] before:size-1.5 before:rotate-45 before:bg-acc"
            >
              {pt}
            </li>
          ))}
        </ul>
        <div>
          <TextLink icon={<ArrowRight />} onClick={onPage(() => openRole(r.slug))}>
            See it on the page
          </TextLink>
        </div>
      </div>
    );
  }

  if (name !== "navigate") return null;

  switch (i.section) {
    case "about":
      return (
        <div className={inline} data-inline="about">
          <p className="font-serif text-[19px] leading-[1.3]">{config.about.line}</p>
          <dl className="m-0 grid gap-1.5">
            {config.about.facts.map((f) => (
              <div key={f.label} className="grid grid-cols-[96px_1fr] gap-2 text-[13.5px]">
                <dt className={kicker}>{f.label}</dt>
                <dd className="m-0 text-fg2">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case "projects":
      return (
        <div className={inline} data-inline="projects">
          <p className={kicker}>Tap one to hear about it</p>
          <div>
            {config.projects.map((p) => (
              <button
                key={p.id}
                type="button"
                className={row}
                onClick={() => ask(`Tell me about ${p.name}`)}
              >
                <span className="font-serif text-[21px] leading-tight">{p.name}</span>
                <span className={kicker}>{p.year}</span>
              </button>
            ))}
          </div>
        </div>
      );
    case "experience":
      return (
        <div className={inline} data-inline="experience">
          <p className={kicker}>Tap a role for the detail</p>
          <div>
            {[...config.roles].reverse().map((r) => (
              <button
                key={r.slug}
                type="button"
                className={row}
                onClick={() => ask(`Tell me about ${r.org}`)}
              >
                <span className="grid">
                  <span className="font-serif text-[19px] leading-tight">{r.role}</span>
                  <span className="font-mono text-[11px] text-acc">{r.org}</span>
                </span>
                <span className={kicker}>{r.period.split(" ").at(-1)}</span>
              </button>
            ))}
          </div>
        </div>
      );
    case "education":
      return (
        <div className={inline} data-inline="education">
          {config.education.map((e) => (
            <p key={e.slug} className="grid grid-cols-[52px_1fr] gap-2 border-t border-line pt-2">
              <span className="font-mono text-xs text-acc">{e.year}</span>
              <span className="grid">
                <span className="font-serif text-[18px] leading-tight">{e.title}</span>
                <span className="text-[12.5px] text-muted">{e.org}</span>
              </span>
            </p>
          ))}
        </div>
      );
    case "contact":
      return (
        <div className={inline} data-inline="contact">
          <div className="flex flex-wrap gap-x-5">
            <TextLink href={`mailto:${config.contact.email}`} accent icon={<Mail />}>
              Email
            </TextLink>
            <TextLink
              href={config.contact.links.github}
              target="_blank"
              rel="noreferrer"
              icon={<GitHub />}
            >
              GitHub
            </TextLink>
            <TextLink
              href={config.contact.links.linkedin}
              target="_blank"
              rel="noreferrer"
              icon={<LinkedIn />}
            >
              LinkedIn
            </TextLink>
          </div>
          <div>
            <TextLink icon={<ArrowRight />} onClick={() => ask("I'd like to get in touch")}>
              Leave a note with Dusk
            </TextLink>
          </div>
        </div>
      );
    default:
      return null;
  }
}
