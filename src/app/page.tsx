import { loadSite } from "@/features/content/server";
import { Intro } from "@/features/sections";
import { Stage, TopBar } from "@/features/stage";

export default async function Home() {
  const { profile } = await loadSite();

  return (
    <Stage word={profile.name.toUpperCase()}>
      <TopBar domain={profile.domain} />
      {/* Content sits to the right of the companion column on desktop (the column itself arrives in P3) */}
      <main className="absolute inset-y-0 right-0 left-0 z-2 desk:left-(--col)">
        <Intro profile={profile} />
      </main>
    </Stage>
  );
}
