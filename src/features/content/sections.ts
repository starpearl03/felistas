// Page structure (not content): the order and labels of the snapped sections.

export const SECTION_IDS = [
  "home",
  "about",
  "projects",
  "experience",
  "education",
  "contact",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const SECTIONS: readonly { id: SectionId; label: string }[] = [
  { id: "home", label: "Intro" },
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "contact", label: "Contact" },
];

export type ProjectStatus = "LIVE" | "DONE" | "WIP";

/** How a project's status reads in the index, the detail panel and Dusk's answers. */
export const PROJECT_STATUS: Record<ProjectStatus, { tag: string; detail: string; since: string }> =
  {
    LIVE: { tag: "Live", detail: "in use", since: "in use since" },
    DONE: { tag: "Complete", detail: "complete", since: "completed in" },
    WIP: { tag: "Building", detail: "in progress", since: "in progress since" },
  };
