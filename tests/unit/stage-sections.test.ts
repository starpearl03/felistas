import { afterEach, describe, expect, it } from "vitest";
import { selectProject, selectRole } from "@/features/stage/commands";
import { detectSection, sheetSlot } from "@/features/stage/engine/geometry";
import { INITIAL_STAGE_STATE, stageStore } from "@/features/stage/store";

const sections = [
  { id: "home", top: 0 },
  { id: "about", top: 900 },
  { id: "projects", top: 1800 },
] as const;

describe("detectSection", () => {
  it("returns the first section at the top of the page", () => {
    expect(detectSection(sections, 0, 900)).toBe("home");
  });

  it("switches once a section's top passes 45% of the viewport", () => {
    expect(detectSection(sections, 900 - 405 - 1, 900)).toBe("home");
    expect(detectSection(sections, 900 - 405, 900)).toBe("about");
  });

  it("stays on the last section past the end", () => {
    expect(detectSection(sections, 99_999, 900)).toBe("projects");
  });

  it("returns null when there are no sections", () => {
    expect(detectSection([], 0, 900)).toBeNull();
  });
});

describe("sheetSlot", () => {
  it("sits in the companion sheet header at the bottom left", () => {
    expect(sheetSlot(390, 844)).toEqual({ x: 36, y: 720 });
  });
});

describe("selection commands", () => {
  afterEach(() => stageStore.set(INITIAL_STAGE_STATE));

  it("store the selected project and role", () => {
    selectProject("atlas");
    selectRole("kestrel-systems");
    expect(stageStore.get()).toMatchObject({ projectId: "atlas", roleSlug: "kestrel-systems" });
  });
});
