import { Fragment } from "react";
import type { Profile, Skills } from "@/features/content";
import { Emphasis } from "../shared/Emphasis";
import { Eyebrow } from "../shared/Eyebrow";
import { SectionShell } from "../shared/SectionShell";
import { bodyClass, ruledRow } from "../shared/styles";

/** About: a statement, the bio with a spec sheet beside it, and the daily stack on one line. */
export function About({ profile, skills }: { profile: Profile; skills: Skills }) {
  const stack = skills.groups.flatMap((g) => g.items);

  return (
    <SectionShell id="about" label="About">
      <Eyebrow label="About" detail="the engineer" />
      <h2
        data-fly
        className="max-w-[18ch] font-serif text-[clamp(36px,4.4vw,68px)] leading-[1.02] tracking-[-.01em] text-balance"
      >
        <Emphasis parts={profile.lineParts} />
      </h2>

      <div className="mt-10 grid items-start gap-[clamp(24px,4vw,64px)] desk:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {profile.about.map((p, i) => (
            <p key={i} className={`${bodyClass} mb-3.5`}>
              {p}
            </p>
          ))}
          <p className="mt-[22px] flex items-baseline gap-3 text-sm leading-[1.6] text-fg2">
            <b className="inline-flex items-center gap-2 font-mono text-[10.5px] font-normal tracking-[.14em] whitespace-nowrap text-acc uppercase before:size-1.5 before:animate-pulse-soft before:rounded-full before:bg-acc motion-reduce:before:animate-none">
              Currently
            </b>
            {profile.now}
          </p>
        </div>

        <dl className="m-0 grid min-w-0">
          {profile.facts.map((f) => (
            <div key={f.label} className={`grid grid-cols-[110px_1fr] gap-4 py-3 ${ruledRow}`}>
              <dt className="pt-[3px] font-mono text-[10.5px] tracking-[.14em] text-muted uppercase">
                {f.label}
              </dt>
              <dd className="m-0 text-[15px]">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-[30px] font-mono text-[13px] leading-[2.1] text-muted">
        Daily stack <span className="text-acc/35"> · </span>
        {stack.map((s, i) => (
          <Fragment key={s}>
            {/* real spaces give the line places to wrap on narrow screens */}
            {i > 0 ? <span className="text-acc/35"> / </span> : null}
            <span className="whitespace-nowrap text-fg2 transition-colors hover:text-acc">{s}</span>
          </Fragment>
        ))}
      </p>
    </SectionShell>
  );
}
