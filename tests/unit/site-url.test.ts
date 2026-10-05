import { describe, expect, it, vi } from "vitest";
import { resolveSiteUrl } from "@/lib/site-url";

describe("resolveSiteUrl", () => {
  it("uses a full configured URL, trimmed to its origin", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://felistas.dev/some/path" }).href).toBe(
      "https://felistas.dev/",
    );
  });

  it("falls back to Vercel's production URL when the value is not a URL, and warns once", () => {
    const warn = vi.fn();
    const env = {
      NEXT_PUBLIC_SITE_URL: "felistas",
      VERCEL_PROJECT_PRODUCTION_URL: "felistas.vercel.app",
    };
    expect(resolveSiteUrl(env, warn).href).toBe("https://felistas.vercel.app/");
    resolveSiteUrl(env, warn);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("rejects hosts without a dot and non-http schemes", () => {
    const env = { VERCEL_URL: "felistas-abc.vercel.app" };
    expect(resolveSiteUrl({ ...env, NEXT_PUBLIC_SITE_URL: "https://felistas" }, vi.fn()).host).toBe(
      "felistas-abc.vercel.app",
    );
    expect(resolveSiteUrl({ ...env, NEXT_PUBLIC_SITE_URL: "ftp://x.dev" }, vi.fn()).host).toBe(
      "felistas-abc.vercel.app",
    );
  });

  it("uses localhost when nothing is set", () => {
    expect(resolveSiteUrl({}).href).toBe("http://localhost:3000/");
  });
});
