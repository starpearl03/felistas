import type { SectionId } from "@/features/content";
import { createStore } from "@/lib/store";
import { DEFAULT_MOTION, type Motion, MOTION_STORAGE_KEY, resolveMotion } from "./motion";

export type StageState = {
  motion: Motion;
  /** Written by the loop's scroll-position detection (P3), never by commands */
  section: SectionId;
};

/** What the server renders; the client reconciles after hydration. */
export const INITIAL_STAGE_STATE: StageState = { motion: DEFAULT_MOTION, section: "home" };

export const stageStore = createStore<StageState>(INITIAL_STAGE_STATE);

let motionHydrated = false;

/** Reads the saved motion level and the reduced-motion preference once, on the client. */
export function hydrateMotion(): void {
  if (motionHydrated || typeof window === "undefined") return;
  motionHydrated = true;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
  } catch {
    // storage can be blocked (private mode, sandboxed frames); fall back to the defaults
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  stageStore.set({ motion: resolveMotion(stored, reduced) });
}

export function persistMotion(motion: Motion): void {
  try {
    window.localStorage.setItem(MOTION_STORAGE_KEY, motion);
  } catch {
    // the choice still applies for this visit
  }
}
