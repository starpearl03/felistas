import type { CSSProperties } from "react";
import type { Profile } from "@/features/content";
import { Emphasis } from "../shared/Emphasis";
import { GoTo } from "../shared/GoTo";
import { SectionShell } from "../shared/SectionShell";

const rise = (i: number): CSSProperties => ({ animationDelay: `${i * 80}ms` });
const riseClass = "animate-rise motion-reduce:animate-none";

/**
 * The first screen. The name itself is spelled in glyphs on the canvas, so the real h1 is for
 * screen readers. "Ask Dusk" and the resume link arrive with the phases that make them work.
 */
export function Intro({ profile }: { profile: Profile }) {
  const focus = profile.facts.find((f) => f.label === "Focus")?.value;

  return (
    <SectionShell id="home" label="Intro" variant="hero">
      <h1 className="sr-only">
        {profile.name}, {profile.role}
      </h1>

      <div
        style={rise(0)}
        className={`${riseClass} flex flex-wrap gap-x-[22px] gap-y-2 font-mono text-[11.5px] tracking-[.12em] text-fg2 uppercase text-glow`}
      >
        <span className="inline-flex items-center gap-2 text-fg before:size-[7px] before:rounded-full before:bg-acc before:shadow-[0_0_0_4px_var(--soft)]">
          {profile.availability}
        </span>
        <span>{profile.role}</span>
        {focus ? <span>{focus}</span> : null}
      </div>

      <p
        style={rise(1)}
        className={`${riseClass} mt-3.5 mb-[22px] max-w-[28ch] font-serif text-[clamp(24px,2.3vw,34px)] leading-[1.18] text-balance text-glow`}
      >
        <Emphasis parts={profile.lineParts} />
      </p>

      <div
        style={rise(2)}
        className={`${riseClass} flex flex-wrap items-center gap-x-[30px] gap-y-3`}
      >
        <GoTo section="projects">See the work</GoTo>
      </div>

      <p style={rise(3)} className={`${riseClass} mt-5 text-[12.5px] text-muted text-glow`}>
        Run your cursor through the name. The glyphs part around it, and the sphere follows you.
      </p>

      <span
        aria-hidden
        className="absolute right-[clamp(20px,3vw,44px)] bottom-[52px] hidden items-center gap-3 font-mono text-[10.5px] tracking-[.2em] text-muted [writing-mode:vertical-rl] after:h-[46px] after:w-px after:animate-drift after:bg-linear-to-b after:from-acc after:to-transparent motion-reduce:after:animate-none desk:flex"
      >
        SCROLL
      </span>
    </SectionShell>
  );
}
