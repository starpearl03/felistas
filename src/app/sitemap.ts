import type { MetadataRoute } from "next";
import { loadSite, resumeMeta } from "@/features/content/server";
import { resolveSiteUrl } from "@/lib/site-url";

/**
 * One page (the sections are parts of it, not routes), plus the resume, which search engines index
 * too. The page changes with each deploy; the resume carries the date of its last commit.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveSiteUrl();
  const { resume } = (await loadSite()).profile;
  const now = new Date();
  const page: MetadataRoute.Sitemap[number] = {
    url: base.toString(),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 1,
  };
  if (!resume.available) return [page];
  const { changedAt } = await resumeMeta(resume.source);
  return [
    page,
    {
      url: new URL(resume.href, base).toString(),
      lastModified: changedAt ? new Date(changedAt) : now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ] satisfies MetadataRoute.Sitemap;
}
