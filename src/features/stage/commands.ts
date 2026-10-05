// The command bus: every page action the visitor or Dusk can trigger. UI clicks and AI tool calls
// both go through these functions so they animate identically. Commands never set `section`
// directly: they scroll, and the loop's scroll-position detection follows.
import type { SectionId } from "@/features/content";
import type { Motion } from "./motion";
import { type Draft, persistMotion, stageStore, type Voice } from "./store";

export const SCROLLER_SELECTOR = "[data-scroller]";

export function setMotion(motion: Motion): void {
  stageStore.set({ motion });
  persistMotion(motion);
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  stageStore.get().motion === "still";

/** Scrolls the page to a section. Returns false when the section is not on the page. */
export function navigate(section: SectionId): boolean {
  const scroller = document.querySelector<HTMLElement>(SCROLLER_SELECTOR);
  const target = scroller?.querySelector<HTMLElement>(`[data-sec="${section}"]`);
  if (!scroller || !target) return false;
  scroller.scrollTo({
    top: target.offsetTop,
    // "auto" would follow the scroller's CSS scroll-smooth, so Still must ask for "instant"
    behavior: prefersReducedMotion() ? "instant" : "smooth",
  });
  return true;
}

let flashId = 0;

/** Spells a word in the glyph field for `ms`, then the name returns (UI-SPEC §4). */
export function flashWord(word: string, ms: number): void {
  stageStore.set({ flash: { word: word.toUpperCase().slice(0, 12), ms, id: ++flashId } });
}

export function selectProject(id: string): void {
  stageStore.set({ projectId: id });
}

export function selectRole(slug: string): void {
  stageStore.set({ roleSlug: slug });
}

/** Opens a project: scrolls to Projects, selects it and spells its name in the glyph field. */
export function openProject(id: string, name?: string): void {
  navigate("projects");
  selectProject(id);
  if (name) flashWord(name, 3200);
}

/** Opens a role on the Experience ruler. */
export function openRole(slug: string): void {
  navigate("experience");
  selectRole(slug);
}

/** Starts a real download of the resume file. */
export function downloadResume(href: string, file: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = file;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
}

let nextId = 0;

/** Shows the draft card. Nothing is sent until the visitor presses Send on it. */
export function showDraft(draft: Omit<Draft, "id">): void {
  stageStore.set({ draft: { ...draft, id: ++nextId }, chatOpen: true });
}

export function clearDraft(): void {
  stageStore.set({ draft: null });
}

/** Opens the companion (the sheet on phones) and focuses the composer. */
export function openChat(): void {
  stageStore.set({ chatOpen: true });
  requestAnimationFrame(() => document.querySelector<HTMLInputElement>("#dusk-input")?.focus());
}

export function closeChat(): void {
  stageStore.set({ chatOpen: false });
  // on phones, folding the sheet also drops the keyboard
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.id === "dusk-input") active.blur();
}

/** Asks Dusk a question from anywhere on the page. */
export function ask(text: string): void {
  stageStore.set({ ask: { text, id: ++nextId }, chatOpen: true });
}

export function setVoice(voice: Voice): void {
  stageStore.set({ voice });
}

export function toast(text: string): void {
  stageStore.set({ toast: { text, id: ++nextId } });
}
