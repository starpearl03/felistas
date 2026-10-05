import { loadSite } from "@/features/content/server";
import { About, Contact, Education, Experience, Intro, Projects } from "@/features/sections";
import { Stage, TopBar } from "@/features/stage";

export default async function Home() {
  const site = await loadSite();

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
    </Stage>
  );
}
