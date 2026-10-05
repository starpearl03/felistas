// The command bus: every page action the visitor or Dusk can trigger. UI clicks and AI tool calls
// both go through these functions so they animate identically. Commands never set `section`
// directly: they scroll, and the loop's scroll-position detection follows.
import type { SectionId } from "@/features/content";
import type { Motion } from "./motion";
import { persistMotion, stageStore } from "./store";

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

export function selectProject(id: string): void {
  stageStore.set({ projectId: id });
}

export function selectRole(slug: string): void {
  stageStore.set({ roleSlug: slug });
}
