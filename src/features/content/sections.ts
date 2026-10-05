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
