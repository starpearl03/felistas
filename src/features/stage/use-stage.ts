"use client";

import { useSyncExternalStore } from "react";
import { INITIAL_STAGE_STATE, type StageState, stageStore } from "./store";

/** Subscribes a component to one slice of the stage store. */
export function useStage<T>(select: (s: StageState) => T): T {
  return useSyncExternalStore(
    stageStore.subscribe,
    () => select(stageStore.get()),
    () => select(INITIAL_STAGE_STATE),
  );
}
