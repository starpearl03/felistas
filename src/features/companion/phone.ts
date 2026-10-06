import { DESK_MIN_WIDTH } from "@/features/stage";

/** Phones: below the width where the companion becomes a column (UI-SPEC §9). */
export const isPhone = (): boolean => window.innerWidth < DESK_MIN_WIDTH;
