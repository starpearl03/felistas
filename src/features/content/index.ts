// Client-safe public API of the content feature: types and page structure only.
// Server code loads the content from "@/features/content/server".
export { SECTION_IDS, SECTIONS, type SectionId } from "./sections";
export type { Education, FaqEntry, Profile, Project, Role, Site, Skills } from "./types";
