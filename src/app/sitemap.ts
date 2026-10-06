import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/site-url";

/** One page (the sections are parts of it, not routes), plus the resume, which search engines index too. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveSiteUrl();
  const now = new Date();
  return [
    { url: base.toString(), lastModified: now, changeFrequency: "monthly", priority: 1 },
    {
      url: new URL("/resume/felistas-resume.pdf", base).toString(),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
