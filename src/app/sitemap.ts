import type { MetadataRoute } from "next";
import { loadSite } from "@/features/content/server";
import { resolveSiteUrl } from "@/lib/site-url";

/** One page (the sections are parts of it, not routes), plus the resume, which search engines index too. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveSiteUrl();
  const { resume } = (await loadSite()).profile;
  const now = new Date();
  return [
    { url: base.toString(), lastModified: now, changeFrequency: "monthly", priority: 1 },
    ...(resume.available
      ? [
          {
            url: new URL(resume.href, base).toString(),
            lastModified: now,
            changeFrequency: "monthly" as const,
            priority: 0.6,
          },
        ]
      : []),
  ];
}
