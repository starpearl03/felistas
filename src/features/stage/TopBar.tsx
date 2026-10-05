import { MotionSwitch } from "./MotionSwitch";
import { SectionNav } from "./SectionNav";

type TopBarProps = {
  /** e.g. "felistas.dev"; the part after the first dot is muted */
  domain: string;
};

/** The transparent bar across the top of the stage, with the scroll progress line along its top edge. */
export function TopBar({ domain }: TopBarProps) {
  const dot = domain.indexOf(".");
  const name = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-8 flex items-center gap-[18px] px-[clamp(18px,2.6vw,36px)] pt-[calc(18px+env(safe-area-inset-top,0px))] pb-[18px] *:pointer-events-auto">
      <span className="font-mono text-xs tracking-[.06em]">
        {name}
        <span className="text-muted">{tld}</span>
      </span>
      <div className="ml-auto flex items-center gap-[18px]">
        <SectionNav />
        <MotionSwitch />
      </div>
      <div
        data-progress
        aria-hidden
        className="pointer-events-none! absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-acc opacity-60"
      />
    </header>
  );
}
