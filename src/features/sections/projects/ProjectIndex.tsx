"use client";

import type { Project } from "@/features/content";
import { selectProject, useStage } from "@/features/stage";
import { cn } from "@/lib/cn";
import { ruledRow } from "../shared/styles";

export type ProjectSummary = Pick<
  Project,
  "id" | "name" | "kind" | "status" | "year" | "stack" | "desc" | "metric" | "metricLabel"
>;

/** A list of big project names; hover, focus or click selects one and fills the sticky detail. */
export function ProjectIndex({ projects }: { projects: ProjectSummary[] }) {
  const selectedId = useStage((s) => s.projectId);
  const selected = projects.find((p) => p.id === selectedId) ?? projects[0];

  return (
    <div className="mt-[34px] grid items-start gap-[clamp(24px,4vw,64px)] desk:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="grid" role="list" aria-label="Projects">
        {projects.map((p) => {
          const on = p.id === selected.id;
          return (
            <div key={p.id} role="listitem" className={ruledRow}>
              <button
                type="button"
                aria-pressed={on}
                aria-controls="project-detail"
                onClick={() => selectProject(p.id)}
                onMouseEnter={() => selectProject(p.id)}
                onFocus={() => selectProject(p.id)}
                className={cn(
                  "group grid w-full cursor-pointer grid-cols-[56px_1fr_auto] items-baseline gap-4 py-3.5 text-left transition-[padding] duration-300",
                  on && "pl-3.5",
                )}
              >
                <time className="font-mono text-[11px] text-muted">{p.year}</time>
                <b
                  className={cn(
                    "font-serif text-[clamp(34px,3.6vw,56px)] leading-none font-normal transition-colors duration-300",
                    on ? "text-fg" : "text-fg2 group-hover:text-fg",
                  )}
                >
                  {p.name}
                  {on ? (
                    <span aria-hidden className="ml-1.5 align-[0.9em] text-[.28em] text-acc">
                      ●
                    </span>
                  ) : null}
                </b>
                <span className="font-mono text-[11px] tracking-[.1em] text-muted uppercase">
                  {p.status === "LIVE" ? "Live" : "Building"}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div
        id="project-detail"
        aria-live="polite"
        className="grid gap-4 desk:sticky desk:top-[110px]"
      >
        <span className="font-mono text-[11px] tracking-[.12em] text-acc uppercase">
          {selected.kind} · {selected.status === "LIVE" ? "in production" : "in progress"}
        </span>
        <div className="font-serif text-[clamp(56px,6vw,96px)] leading-[.9] text-fg">
          {selected.metric}
          <small className="mt-2 block font-mono text-[11px] tracking-[.12em] text-muted uppercase">
            {selected.metricLabel}
          </small>
        </div>
        <p className="text-base leading-[1.7] text-fg2">{selected.desc}</p>
        <p className="font-mono text-base text-muted">
          Built with{" "}
          {selected.stack.map((s, i) => (
            <span key={s}>
              {i > 0 ? " · " : ""}
              <b className="font-normal text-fg2">{s}</b>
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
