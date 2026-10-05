import type { SectionId } from "@/features/content";
import { createStore } from "@/lib/store";
import type { ShapeName } from "./engine/shapes";
import { DEFAULT_MOTION, type Motion, MOTION_STORAGE_KEY, resolveMotion } from "./motion";

/** A message the visitor is about to send to Felistas, shown on the draft card. */
export type Draft = {
  replyTo: string;
  name?: string;
  company?: string;
  topic?: string;
  message: string;
  /** Honeypot value carried from the contact letter */
  website?: string;
  id: number;
};

/** What Dusk is doing, which the sphere shows: thinking shrinks and spins, speaking ripples. */
export type Voice = "idle" | "think" | "speak";

export type StageState = {
  motion: Motion;
  /** Written by the loop's scroll-position detection, never by commands */
  section: SectionId;
  /** Selected project id; null means the first project */
  projectId: string | null;
  /** Selected role slug; null means the current role */
  roleSlug: string | null;
  /** A word to spell briefly in the glyph field; `id` changes on every request */
  flash: { word: string; ms: number; id: number } | null;
  /** The sphere's current form, written by the engine */
  shape: ShapeName;
  voice: Voice;
  /** Phones: whether the companion sheet is expanded */
  chatOpen: boolean;
  draft: Draft | null;
  /** A question asked from elsewhere on the page, for the companion to send */
  ask: { text: string; id: number } | null;
  toast: { text: string; id: number } | null;
};

/** What the server renders; the client reconciles after hydration. */
export const INITIAL_STAGE_STATE: StageState = {
  motion: DEFAULT_MOTION,
  section: "home",
  projectId: null,
  roleSlug: null,
  flash: null,
  shape: "sphere",
  voice: "idle",
  chatOpen: false,
  draft: null,
  ask: null,
  toast: null,
};

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
