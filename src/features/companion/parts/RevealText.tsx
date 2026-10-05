"use client";

import { useEffect, useState } from "react";

type RevealTextProps = {
  text: string;
  /** Reveal word by word (the newest reply); otherwise show the whole text at once */
  animate: boolean;
  onRevealingChange?: (revealing: boolean) => void;
};

const WORD_MS = 28;

/** Dusk's voice: serif text that appears word by word as it is spoken (UI-SPEC §6). */
export function RevealText({ text, animate, onRevealingChange }: RevealTextProps) {
  const words = text.match(/\S+\s*/g) ?? [];
  const [shown, setShown] = useState(animate ? 0 : words.length);
  const done = shown >= words.length;

  useEffect(() => {
    if (!animate) return;
    if (done) {
      onRevealingChange?.(false);
      return;
    }
    onRevealingChange?.(true);
    const timer = setTimeout(() => setShown((n) => n + 1), WORD_MS);
    return () => clearTimeout(timer);
  }, [animate, done, shown, onRevealingChange]);

  // Screen readers get the full text once, not a word at a time
  return (
    <p className="font-serif text-xl leading-[1.38] [overflow-wrap:anywhere] whitespace-pre-wrap text-fg text-glow">
      <span aria-hidden={!done}>{animate ? words.slice(0, shown).join("") : text}</span>
      {!done ? <span className="sr-only">{text}</span> : null}
    </p>
  );
}
