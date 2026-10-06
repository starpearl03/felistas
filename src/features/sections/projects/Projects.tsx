import type { Project } from "@/features/content";
import { Eyebrow } from "../shared/Eyebrow";
import { SectionShell } from "../shared/SectionShell";
import { h2Class } from "../shared/styles";
import { ProjectIndex, type ProjectSummary } from "./ProjectIndex";

export function Projects({ projects }: { projects: Project[] }) {
  // Only what the index renders crosses to the client
  const summaries: ProjectSummary[] = projects.map(
    ({ id, name, kind, status, year, stack, desc, metric, metricLabel, url }) => ({
      id,
      name,
      kind,
      status,
      year,
      stack,
      desc,
      metric,
      metricLabel,
      url,
    }),
  );

  return (
    <SectionShell id="projects" label="Projects">
      <Eyebrow label="Projects" detail={`${projects.length} on record`} />
      <h2 data-fly className={h2Class}>
        Selected work
      </h2>
      <ProjectIndex projects={summaries} />
    </SectionShell>
  );
}
