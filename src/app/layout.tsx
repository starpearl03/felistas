import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { loadSite } from "@/features/content/server";
import { env } from "@/lib/env";
import { PALETTE } from "@/lib/palette";
import { resolveSiteUrl } from "@/lib/site-url";
import "./globals.css";
import { siteMetadata } from "./seo";

// Font roles are defined in docs/ui/UI-SPEC.md §2. Canvas code must read the
// real family names from these CSS variables, because next/font renames them.
const sans = Geist({ variable: "--ff-sans", subsets: ["latin"] });
// Not preloaded: small labels only, so it must not compete with the first paint on slow networks
const mono = Geist_Mono({ variable: "--ff-mono", subsets: ["latin"], preload: false });
const serif = Instrument_Serif({
  variable: "--ff-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
const display = Big_Shoulders({
  variable: "--ff-display",
  subsets: ["latin"],
  weight: "900",
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
  adjustFontFallback: false,
  // Not preloaded: only the canvas uses it, and it re-draws the name once the face arrives
  preload: false,
});

/** Search metadata from content/profile.md, like every other fact on the site (see ./seo.ts). */
export async function generateMetadata(): Promise<Metadata> {
  return siteMetadata(await loadSite(), resolveSiteUrl(), env().GOOGLE_SITE_VERIFICATION);
}

export const viewport: Viewport = {
  themeColor: PALETTE.bg,
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${serif.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
