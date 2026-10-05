"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "@/components/ui/icons";
import { TextLink } from "@/components/ui/TextLink";
import type { SectionId } from "@/features/content";
import { navigate } from "@/features/stage";

/** A text link that scrolls to a section through the command bus. */
export function GoTo({ section, children }: { section: SectionId; children: ReactNode }) {
  return (
    <TextLink onClick={() => navigate(section)} icon={<ArrowRight />}>
      {children}
    </TextLink>
  );
}
