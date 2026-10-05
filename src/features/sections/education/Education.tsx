import type { Education as EducationEntry } from "@/features/content";
import { Eyebrow } from "../shared/Eyebrow";
import { SectionShell } from "../shared/SectionShell";
import { h2Class, ruledRow } from "../shared/styles";

/** Huge outlined years beside each degree or certification; the year fills on hover. */
export function Education({ entries }: { entries: EducationEntry[] }) {
  return (
    <SectionShell id="education" label="Education">
      <Eyebrow label="Education" detail="learning" />
      <h2 data-fly className={h2Class}>
        Foundations
      </h2>
      <div className="mt-[34px] grid">
        {entries.map((e) => (
          <div
            key={e.slug}
            className={`group grid items-center gap-[clamp(20px,4vw,56px)] py-[18px] desk:grid-cols-[minmax(150px,.7fr)_minmax(0,1.3fr)] ${ruledRow}`}
          >
            <span
              aria-hidden
              className="font-display text-[clamp(64px,8vw,128px)] leading-[.85] font-black text-transparent transition-colors duration-400 [-webkit-text-stroke:1px_color-mix(in_srgb,var(--acc)_55%,transparent)] group-hover:text-acc"
            >
              {e.year}
            </span>
            <div>
              <h3 className="font-serif text-[clamp(28px,2.8vw,40px)] leading-[1.05]">
                {e.title} <span className="sr-only">({e.year})</span>
              </h3>
              <p className="mt-2 mb-2.5 font-mono text-[11.5px] tracking-[.08em] text-acc uppercase">
                {e.org}
              </p>
              <p className="max-w-[52ch] text-[15px] leading-[1.65] text-fg2">{e.note}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
