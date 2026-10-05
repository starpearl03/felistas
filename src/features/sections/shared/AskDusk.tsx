"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "@/components/ui/icons";
import { TextLink } from "@/components/ui/TextLink";
import { ask, openChat } from "@/features/stage";

/**
 * A text link that hands a question to Dusk, or just opens the conversation when there is no
 * question. Anything a visitor can click, they can also ask for.
 */
export function AskDusk({
  question,
  accent = true,
  icon = <ArrowRight />,
  children,
}: {
  question?: string;
  accent?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <TextLink accent={accent} icon={icon} onClick={() => (question ? ask(question) : openChat())}>
      {children}
    </TextLink>
  );
}
