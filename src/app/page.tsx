import { profile } from "@/content/profile";

// Placeholder until the Dusk stage is built. See docs/ui/UI-SPEC.md for the target UI.
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col justify-end gap-4 px-6 pb-16 sm:px-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-acc">Portfolio in progress</p>
      <h1 className="font-serif text-6xl leading-[0.95] sm:text-8xl">{profile.name}</h1>
      <p className="max-w-[28ch] font-serif text-2xl text-fg2">{profile.line}</p>
    </main>
  );
}
