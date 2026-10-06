import type { ProjectStatus, Site } from "@/features/content";

/** The slice of the content the agent works from. Built from `content/`, never hard-coded. */
export type AgentRecord = {
  name: string;
  role: string;
  line: string;
  availability: string;
  about: string[];
  now: string;
  email: string;
  resumeAvailable: boolean;
  skills: string[];
  projects: {
    id: string;
    name: string;
    kind: string;
    status: ProjectStatus;
    year: string;
    stack: string[];
    desc: string;
  }[];
  roles: {
    slug: string;
    role: string;
    org: string;
    period: string;
    current: boolean;
    points: string[];
  }[];
  education: { title: string; org: string; year: string }[];
  faq: { question: string; answer: string }[];
};

export function buildRecord(site: Site): AgentRecord {
  return {
    name: site.profile.name,
    role: site.profile.role,
    line: site.profile.line,
    availability: site.profile.availability,
    about: site.profile.about,
    now: site.profile.now,
    email: site.profile.email,
    resumeAvailable: site.profile.resume.available,
    skills: site.skills.groups.flatMap((g) => g.items),
    projects: site.projects.map(({ id, name, kind, status, year, stack, desc }) => ({
      id,
      name,
      kind,
      status,
      year,
      stack,
      desc,
    })),
    roles: site.experience.map(({ slug, role, org, period, current, points }) => ({
      slug,
      role,
      org,
      period,
      current,
      points,
    })),
    education: site.education.map(({ title, org, year }) => ({ title, org, year })),
    faq: site.faq,
  };
}
