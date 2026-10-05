import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

// Font roles are defined in docs/ui/UI-SPEC.md §2. Canvas code must read the
// real family names from these CSS variables, because next/font renames them.
const sans = Geist({ variable: "--ff-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--ff-mono", subsets: ["latin"] });
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
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Felistas · Software Engineer",
  description:
    "Backends, data pipelines and AI features that stay calm under load. Ask Dusk, the portfolio's AI, anything about Felistas.",
};

export const viewport: Viewport = {
  themeColor: "#110b10",
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
