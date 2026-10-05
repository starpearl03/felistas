import type { ReactNode } from "react";
import type { SectionId } from "@/features/content";
import { cn } from "@/lib/cn";

type SectionShellProps = {
  id: SectionId;
  /** Accessible name; the visible heading may be decorative or split */
  label: string;
  /** The intro sits at the bottom of the screen on its own scrim */
  variant?: "default" | "hero";
  children: ReactNode;
};

/**
 * One snapped, full-height chapter. Mobile keeps 200px free at the bottom for the companion sheet
 * (UI-SPEC §9).
 */
export function SectionShell({ id, label, variant = "default", children }: SectionShellProps) {
  const hero = variant === "hero";
  return (
    <section
      id={id}
      data-sec={id}
      aria-label={label}
      className={cn(
        "relative box-border flex min-h-full snap-start flex-col px-[18px] pt-[84px]",
        "desk:pr-[clamp(24px,5vw,80px)] desk:pl-[clamp(20px,2.6vw,40px)]",
        hero
          ? "scrim-hero justify-end pb-[190px] desk:pb-[52px]"
          : "panel justify-center pb-[200px] desk:pt-24 desk:pb-[72px]",
      )}
    >
      {children}
    </section>
  );
}
