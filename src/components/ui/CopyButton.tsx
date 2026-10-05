"use client";

import { useEffect, useRef, useState } from "react";

type CopyButtonProps = {
  value: string;
  /** Element whose text is selected when the clipboard is unavailable */
  fallbackTargetId?: string;
};

/** Copies a value. Falls back to selecting the text so the visitor can press Ctrl+C. */
export function CopyButton({ value, fallbackTargetId }: CopyButtonProps) {
  const [label, setLabel] = useState("Copy");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = (text: string) => {
    setLabel(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLabel("Copy"), 1600);
  };

  const fallback = () => {
    const target = fallbackTargetId ? document.getElementById(fallbackTargetId) : null;
    if (target) {
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    show("Press Ctrl+C");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      show("Copied");
    } catch {
      fallback();
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${value}`}
      className="cursor-pointer font-mono text-[10.5px] tracking-[.14em] text-muted uppercase transition-colors hover:text-acc"
    >
      <span aria-live="polite">{label}</span>
    </button>
  );
}
