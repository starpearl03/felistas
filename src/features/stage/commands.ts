// The command bus: every page action the visitor or Dusk can trigger. UI clicks and AI tool calls
// both go through these functions so they animate identically. More commands arrive with P3 and P6.
import type { Motion } from "./motion";
import { persistMotion, stageStore } from "./store";

export function setMotion(motion: Motion): void {
  stageStore.set({ motion });
  persistMotion(motion);
}
