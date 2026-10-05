import type { z } from "zod";
import type {
  educationSchema,
  profileSchema,
  projectSchema,
  roleSchema,
  skillsSchema,
} from "./schema";

type Data<S extends z.ZodType> = Omit<z.output<S>, "sample">;

export type TextPart = { text: string; em: boolean };

export type Profile = Data<typeof profileSchema> & {
  /** The line as plain text (emphasis markers removed) */
  line: string;
  /** The line split into plain and `*emphasised*` parts, for rendering */
  lineParts: TextPart[];
  /** Paragraphs from the body of content/profile.md */
  about: string[];
};

export type Skills = Data<typeof skillsSchema> & { body: string };

export type Project = Data<typeof projectSchema> & {
  /** From the file name, e.g. content/projects/ledgerline.md → "ledgerline" */
  id: string;
  body: string;
};

export type Role = Data<typeof roleSchema> & { slug: string; body: string };

export type Education = Data<typeof educationSchema> & { slug: string; body: string };

export type FaqEntry = { question: string; answer: string };

/** Everything the site, the retrieval index and the offline agent know about Felistas. */
export type Site = {
  profile: Profile;
  skills: Skills;
  /** Sorted by `order` */
  projects: Project[];
  /** Chronological by start year */
  experience: Role[];
  /** Sorted by `order` */
  education: Education[];
  faq: FaqEntry[];
  /** True while any file still carries `sample: true` */
  sample: boolean;
};
