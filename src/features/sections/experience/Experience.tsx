import type { Role } from "@/features/content";
import { Eyebrow } from "../shared/Eyebrow";
import { SectionShell } from "../shared/SectionShell";
import { h2Class } from "../shared/styles";
import { type RoleSummary, YearRuler } from "./YearRuler";

export function Experience({ roles }: { roles: Role[] }) {
  const first = Math.floor(Math.min(...roles.map((r) => r.start)));
  // "now" only while a role is current; otherwise the year the latest one ended
  const until = roles.some((r) => r.current)
    ? "now"
    : String(Math.floor(Math.max(...roles.map((r) => r.end))));
  const last = Math.floor(Math.max(...roles.map((r) => r.end))) + 1;
  const summaries: RoleSummary[] = roles.map(
    ({ slug, role, org, period, start, end, current, points }) => ({
      slug,
      role,
      org,
      period,
      start,
      end,
      current,
      points,
    }),
  );

  return (
    <SectionShell id="experience" label="Experience">
      <Eyebrow label="Experience" detail={`${first} to ${until}`} />
      <h2 data-fly className={h2Class}>
        Where I&apos;ve worked
      </h2>
      <YearRuler roles={summaries} from={first} to={last} />
    </SectionShell>
  );
}
