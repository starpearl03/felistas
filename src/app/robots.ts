import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const site = resolveSiteUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: new URL("/sitemap.xml", site).toString(),
  };
}
