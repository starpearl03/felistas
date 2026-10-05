import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/site-url";

/** One page; the sections are parts of it, not routes. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: resolveSiteUrl().toString(), changeFrequency: "monthly", priority: 1 }];
}
