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
    icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }],
  };
}
