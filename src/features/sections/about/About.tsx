import type { Profile, Skills } from "@/features/content";
import { Emphasis } from "../shared/Emphasis";
import { Eyebrow } from "../shared/Eyebrow";
import { SectionShell } from "../shared/SectionShell";
import { ruledRow } from "../shared/styles";
import { SkillLine } from "./SkillLine";

/** About: a statement, the bio with a spec sheet beside it, and the daily stack on one line. */
export function About({ profile, skills }: { profile: Profile; skills: Skills }) {
  // The leading skills of each group, so the line stays short; Dusk knows the full list
  const stack = skills.groups.flatMap((g) => g.items.slice(0, 4));

  return (
    <SectionShell id="about" label="About">
      <Eyebrow label="About" detail="the engineer" />
      <h2
        data-fly
        className="max-w-[30ch] font-serif text-[clamp(28px,3.1vw,50px)] leading-[1.05] tracking-[-.01em] text-balance [@media(max-height:820px)]:text-[clamp(26px,2.7vw,40px)]"
      >
        <Emphasis parts={profile.lineParts} />
      </h2>

      <div className="mt-7 grid items-start gap-[clamp(20px,3.5vw,56px)] desk:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] [@media(max-height:820px)]:mt-5">
        <div className="min-w-0">
          {profile.about.map((p, i) => (
            <p key={i} className="mb-3 max-w-[58ch] text-[15px] leading-[1.65] text-fg2">
              {p}
            </p>
          ))}
        </div>

        <div className="min-w-0">
          <dl className="m-0 grid">
            {profile.facts.map((f) => (
              <div key={f.label} className={`grid grid-cols-[110px_1fr] gap-4 py-2.5 ${ruledRow}`}>
                <dt className="pt-[3px] font-mono text-[10.5px] tracking-[.14em] text-muted uppercase">
                  {f.label}
                </dt>
                <dd className="m-0 text-[15px]">{f.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 flex items-baseline gap-3 text-sm leading-[1.6] text-fg2">
            <b className="inline-flex items-center gap-2 font-mono text-[10.5px] font-normal tracking-[.14em] whitespace-nowrap text-acc uppercase before:size-1.5 before:animate-pulse-soft before:rounded-full before:bg-acc motion-reduce:before:animate-none">
              Currently
            </b>
            {profile.now}
          </p>
        </div>
      </div>

      <SkillLine skills={stack} />
    </SectionShell>
  );
}
