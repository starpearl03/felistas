import type { CSSProperties } from "react";
import type { Profile } from "@/features/content";

const rise = (i: number): CSSProperties => ({ animationDelay: `${i * 80}ms` });

const riseClass = "animate-rise motion-reduce:animate-none";

/**
 * The first screen. The name itself is spelled in glyphs on the canvas, so the real h1 is for
 * screen readers. The actions (ask Dusk, resume, see the work) arrive with the phases that make
 * them work.
 */
export function Intro({ profile }: { profile: Profile }) {
  const focus = profile.facts.find((f) => f.label === "Focus")?.value;

  return (
    <section
      data-sec="home"
      className="scrim-hero relative flex h-dvh flex-col justify-end px-[18px] pt-24 pb-[52px] desk:pr-[clamp(24px,5vw,80px)] desk:pl-[clamp(20px,2.6vw,40px)]"
    >
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
        className={`${riseClass} mt-3.5 max-w-[28ch] font-serif text-[clamp(24px,2.3vw,34px)] leading-[1.18] text-balance text-glow`}
      >
        {profile.lineParts.map((part, i) =>
          part.em ? (
            <em key={i} className="text-acc">
              {part.text}
            </em>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
      </p>

      <p style={rise(2)} className={`${riseClass} mt-5 text-[12.5px] text-muted text-glow`}>
        Run your cursor through the name. The glyphs part around it, and the sphere follows you.
      </p>
    </section>
  );
}
