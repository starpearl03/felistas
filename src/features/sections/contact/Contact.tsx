import { CopyButton } from "@/components/ui/CopyButton";
import { CurrentYear } from "@/components/ui/CurrentYear";
import { GitHub, LinkedIn, Mail } from "@/components/ui/icons";
import type { Profile } from "@/features/content";
import { Eyebrow } from "../shared/Eyebrow";
import { SectionShell } from "../shared/SectionShell";
import { h2Class } from "../shared/styles";
import { ContactLetter } from "./ContactLetter";

const linkClass =
  "inline-flex items-center gap-2 text-fg2 underline-offset-4 transition-colors hover:text-acc hover:underline [&_svg]:size-4 [&_svg]:flex-none [&_svg]:text-acc";

/** "https://www.linkedin.com/in/x" reads as "linkedin.com/in/x"; the link still opens the full URL */
const display = (url: string) =>
  url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");

/** Contact: a fill-in letter (to Dusk, or straight to the inbox), the resume, and the direct ways in. */
export function Contact({ profile }: { profile: Profile }) {
  return (
    <SectionShell id="contact" label="Contact">
      <Eyebrow label="Contact" detail="write a note" />
      <h2 data-fly className={h2Class}>
        Let&apos;s build <em className="text-acc">something calm.</em>
      </h2>
      <ContactLetter
        recipient={profile.name}
        resume={
          profile.resume.available ? { href: profile.resume.href, file: profile.resume.file } : null
        }
      />

      <div className="mt-[clamp(18px,3vh,30px)] flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-line pt-[clamp(14px,2.2vh,22px)] text-sm text-fg2">
        <span className="inline-flex items-center gap-2.5">
          <Mail aria-hidden className="size-5 flex-none text-acc" />
          <a
            id="contact-email"
            href={`mailto:${profile.email}`}
            className="font-serif text-[clamp(22px,1.9vw,26px)] text-fg transition-colors select-all hover:text-acc"
          >
            {profile.email}
          </a>
        </span>
        <CopyButton value={profile.email} fallbackTargetId="contact-email" />
        <a href={profile.links.github} target="_blank" rel="noreferrer" className={linkClass}>
          <GitHub />
          {display(profile.links.github)}
        </a>
        <a href={profile.links.linkedin} target="_blank" rel="noreferrer" className={linkClass}>
          <LinkedIn />
          {display(profile.links.linkedin)}
        </a>
      </div>

      <footer className="mt-[clamp(16px,3.5vh,36px)] flex flex-wrap justify-between gap-3 font-mono text-[11px] text-muted">
        <span>
          © <CurrentYear /> {profile.fullName}
        </span>
        <span>Built with Next.js</span>
      </footer>
    </SectionShell>
  );
}
