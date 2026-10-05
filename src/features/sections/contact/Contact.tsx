import { CopyButton } from "@/components/ui/CopyButton";
import { CurrentYear } from "@/components/ui/CurrentYear";
import { Download } from "@/components/ui/icons";
import { TextLink } from "@/components/ui/TextLink";
import type { Profile } from "@/features/content";
import { Eyebrow } from "../shared/Eyebrow";
import { SectionShell } from "../shared/SectionShell";
import { bodyClass, h2Class } from "../shared/styles";
import { ContactLetter } from "./ContactLetter";

const linkClass = "text-fg2 underline-offset-4 transition-colors hover:text-acc hover:underline";

/** Contact: a fill-in letter that Dusk turns into a draft, the resume, and the direct ways in. */
export function Contact({ profile }: { profile: Profile }) {
  const host = (url: string) => url.replace(/^https?:\/\//, "");

  return (
    <SectionShell id="contact" label="Contact">
      <Eyebrow label="Contact" detail="write a note" />
      <h2 data-fly className={h2Class}>
        Let&apos;s build <em className="text-acc">something calm.</em>
      </h2>
      <ContactLetter recipient={profile.name} />
      {profile.resume.available ? (
        <div className="mt-2">
          <TextLink href={profile.resume.href} download={profile.resume.file} icon={<Download />}>
            Download resume
          </TextLink>
        </div>
      ) : null}
      <p className={`${bodyClass} mt-6`}>Or email {profile.name} directly.</p>

      <div className="mt-[30px] flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-line pt-[22px] text-sm text-fg2">
        <a
          id="contact-email"
          href={`mailto:${profile.email}`}
          className="font-serif text-[26px] text-fg transition-colors select-all hover:text-acc"
        >
          {profile.email}
        </a>
        <CopyButton value={profile.email} fallbackTargetId="contact-email" />
        <a href={profile.links.github} target="_blank" rel="noreferrer" className={linkClass}>
          {host(profile.links.github)}
        </a>
        <a href={profile.links.linkedin} target="_blank" rel="noreferrer" className={linkClass}>
          {host(profile.links.linkedin)}
        </a>
      </div>

      <footer className="mt-9 flex flex-wrap justify-between gap-3 font-mono text-[11px] text-muted">
        <span>
          © <CurrentYear /> {profile.name}
        </span>
        <span>Built with Next.js</span>
      </footer>
    </SectionShell>
  );
}
