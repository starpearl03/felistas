import { buildRecord, greeting, greetingChips } from "@/features/agent";
import { Companion, type CompanionConfig } from "@/features/companion";
import { loadSite, resumeMeta } from "@/features/content/server";
import { About, Contact, Education, Experience, Intro, Projects } from "@/features/sections";
import { Stage, TopBar } from "@/features/stage";
import { resolveSiteUrl } from "@/lib/site-url";
import { jsonLdScript, structuredData } from "./seo";

export default async function Home() {
  const site = await loadSite();
  const record = buildRecord(site);
  const { resume } = site.profile;
  // Read live from the resume's source (cached), so replacing the PDF updates the card too
  const meta = await resumeMeta(resume.source);

  const companion: CompanionConfig = {
    name: site.profile.name,
    greeting: greeting(record),
    greetingChips: greetingChips(record),
    resume: {
      available: resume.available,
      href: resume.href,
      file: resume.file,
      size: meta.size,
      updated: meta.updated,
    },
    projects: site.projects.map(
      ({ id, name, kind, year, status, desc, stack, metric, metricLabel, url }) => ({
        id,
        name,
        kind,
        year,
        status,
        desc,
        stack,
        metric,
        metricLabel,
        url,
      }),
    ),
    roles: site.experience.map(({ slug, role, org, period, current, points }) => ({
      slug,
      role,
      org,
      period,
      current,
      points,
    })),
    education: site.education.map(({ slug, year, title, org }) => ({ slug, year, title, org })),
    about: { line: site.profile.line, facts: site.profile.facts },
    contact: { email: site.profile.email, links: site.profile.links },
    ids: {
      projects: site.projects.map((p) => p.id) as [string, ...string[]],
      roles: site.experience.map((r) => r.slug) as [string, ...string[]],
    },
  };

  return (
    <Stage word={site.profile.name.toUpperCase()}>
      <TopBar domain={site.profile.domain} />
      {/* Content flows to the right of the companion column on desktop */}
      <main className="absolute inset-y-0 right-0 left-0 z-2 desk:left-(--col)">
        <div
          data-scroller
          className="absolute inset-0 scrollbar-none snap-y snap-mandatory overflow-x-hidden overflow-y-auto scroll-smooth motion-reduce:scroll-auto max-desk:snap-proximity [@media(max-height:680px)]:snap-proximity"
        >
          <Intro profile={site.profile} />
          <About profile={site.profile} skills={site.skills} />
          <Projects projects={site.projects} />
          <Experience roles={site.experience} />
          <Education entries={site.education} />
          <Contact profile={site.profile} />
        </div>
      </main>
      <Companion config={companion} />
      {/* Who this page is about, for search engines (schema.org Person on a ProfilePage) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData(site, resolveSiteUrl())) }}
      />
    </Stage>
  );
}
