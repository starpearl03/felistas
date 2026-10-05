"use client";

import { useEffect, useState } from "react";
import { useStage } from "@/features/stage";

const SHOW_MS = 3400;

/** A short confirmation at the bottom of the screen, e.g. "Sent." (UI-SPEC §3). */
export function Toast() {
  const toast = useStage((s) => s.toast);
  // A toast shows until its own timer marks it hidden; a new one has a new id
  const [hiddenId, setHiddenId] = useState<number | null>(null);
  const visible = !!toast && toast.id !== hiddenId;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setHiddenId(toast.id), SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-[26px] left-1/2 z-20 max-w-[min(440px,calc(100%-32px))] -translate-x-1/2 rounded-xl bg-[color-mix(in_srgb,var(--bg)_86%,var(--acc))] px-4 py-[11px] text-center text-[13px] shadow-[0_18px_50px_rgba(0,0,0,.5)] transition-[opacity,translate] duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      {toast?.text}
    </div>
  );
}
