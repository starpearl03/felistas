import type { MetadataRoute } from "next";
import { loadSite } from "@/features/content/server";
import { PALETTE } from "@/lib/palette";
import { pageDescription } from "./seo";

/** The web app manifest: how the site appears when saved to a home screen. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await loadSite();
  return {
    name: `${site.profile.fullName} · ${site.profile.role}`,
    short_name: site.profile.name,
    description: pageDescription(site),
    start_url: "/",
    display: "standalone",
    background_color: PALETTE.bg,
    theme_color: PALETTE.bg,
    // Built by scripts/build-icons.ts (npm run icons)
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
