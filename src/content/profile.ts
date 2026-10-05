// The single source of truth for everything the site and Dusk (the AI) say about Felistas.
// It feeds the UI, the Gemini system instruction and the offline fallback matcher.
//
// SAMPLE CONTENT: every value below is a placeholder carried over from the prototype in
// docs/ui. Replace all of it with Felistas's real details before launch.

export type SectionId = "home" | "about" | "projects" | "experience" | "education" | "contact";

export type Project = {
  id: string;
  name: string;
  kind: string;
  status: "LIVE" | "WIP";
  year: string;
  stack: string[];
  desc: string;
  metric: string;
  metricLabel: string;
  url?: string;
};

export type Role = {
  role: string;
  org: string;
  period: string;
  /** Start and end as fractional years, used to place the bar on the Experience ruler. */
  start: number;
  end: number;
  current?: boolean;
  points: string[];
};

export type Education = {
  year: string;
  title: string;
  org: string;
  note: string;
};

export const sections: { id: SectionId; label: string }[] = [
  { id: "home", label: "Intro" },
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "contact", label: "Contact" },
];

export const profile = {
  name: "Felistas",
  role: "Software Engineer",
  line: "Backends, data pipelines and AI features that stay calm under load.",
  availability: "Available for senior roles",
  about: [
    "Felistas is a software engineer who works where systems get busy: APIs that take real traffic, pipelines that move money and data, and AI features that need to be right more often than they are clever.",
    "Five years in, the habits are steady ones. Measure first, keep services boring, write the runbook before the incident, and leave the code easier to read than it was found.",
  ],
  facts: [
    ["Focus", "Backend and applied AI"],
    ["Experience", "5+ years in production"],
    ["Works", "Remote, worldwide"],
    ["Status", "Open to senior roles"],
  ] as [string, string][],
  now: "Leading the payments platform at Northwind Labs. On weekends, a Raft store in Rust.",
  skills: [
    "Go",
    "TypeScript",
    "Python",
    "Rust",
    "SQL",
    "PostgreSQL",
    "Kafka",
    "Redis",
    "gRPC",
    "Kubernetes",
    "Gemini API",
    "RAG",
    "pgvector",
    "React",
    "Astro",
  ],
  projects: [
    {
      id: "ledgerline",
      name: "Ledgerline",
      kind: "Payments infrastructure",
      status: "LIVE",
      year: "2025",
      stack: ["Go", "PostgreSQL", "Kafka"],
      desc: "Real-time reconciliation engine that matches transactions across three banks and flags drift within 90 seconds.",
      metric: "2M+",
      metricLabel: "transactions a day",
    },
    {
      id: "atlas",
      name: "Atlas",
      kind: "Semantic search",
      status: "LIVE",
      year: "2025",
      stack: ["Python", "pgvector", "Gemini"],
      desc: "Search over internal documents with retrieval, reranking and cited answers. Support lookups went from minutes to seconds.",
      metric: "40k",
      metricLabel: "documents indexed",
    },
    {
      id: "quorum",
      name: "Quorum",
      kind: "Distributed config store",
      status: "WIP",
      year: "2026",
      stack: ["Rust", "Raft", "gRPC"],
      desc: "A small Raft-backed key-value store for feature flags, built to learn consensus properly and to survive chaos tests.",
      metric: "5",
      metricLabel: "node chaos suite",
    },
    {
      id: "pulse",
      name: "Pulse",
      kind: "Observability UI",
      status: "LIVE",
      year: "2024",
      stack: ["TypeScript", "React", "WebSockets"],
      desc: "Live dashboard that streams service health and lets on-call engineers replay the last hour of any incident.",
      metric: "<120ms",
      metricLabel: "p95 render time",
    },
  ] satisfies Project[] as Project[],
  experience: [
    {
      role: "Backend Developer",
      org: "Freelance",
      period: "2020 – 2022",
      start: 2020,
      end: 2022,
      points: [
        "Shipped APIs and dashboards for 12 clients",
        "Owned deployments end to end on AWS and Fly.io",
      ],
    },
    {
      role: "Software Engineer",
      org: "Kestrel Systems",
      period: "2022 – 2024",
      start: 2022,
      end: 2024,
      points: [
        "Built the internal search and RAG service",
        "Cut API p95 latency by 63%",
        "Mentored three junior engineers",
      ],
    },
    {
      role: "Senior Software Engineer",
      org: "Northwind Labs",
      period: "2024 – Now",
      start: 2024,
      end: 2026.8,
      current: true,
      points: [
        "Leads the payments platform team of five",
        "Moved settlement from nightly batch to streaming",
        "Introduced SLOs and on-call runbooks",
      ],
    },
  ] satisfies Role[] as Role[],
  education: [
    {
      year: "2020",
      title: "BSc Computer Science",
      org: "University of Technology · 2016 – 2020",
      note: "Distributed systems and machine learning electives. Final project: a fault-tolerant message queue.",
    },
    {
      year: "2023",
      title: "Professional Cloud Developer",
      org: "Google Cloud certification",
      note: "Designing, building and operating services on GCP.",
    },
  ] satisfies Education[] as Education[],
  resume: {
    href: "/resume/felistas-resume.pdf",
    file: "felistas-resume.pdf",
    pages: 2,
    size: "148 KB",
    updated: "Oct 2026",
  },
  email: "hello@felistas.dev",
  links: { github: "https://github.com/felistas", linkedin: "https://linkedin.com/in/felistas" },
};
