import { describe, expect, it } from "vitest";
import { profile, sections } from "@/content/profile";

describe("profile content", () => {
  it("has unique section ids starting with home", () => {
    const ids = sections.map((s) => s.id);
    expect(ids[0]).toBe("home");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique project ids", () => {
    const ids = profile.projects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("places every role on the experience ruler with start before end", () => {
    for (const role of profile.experience) {
      expect(role.end).toBeGreaterThan(role.start);
    }
    expect(profile.experience.filter((r) => r.current)).toHaveLength(1);
  });
});
