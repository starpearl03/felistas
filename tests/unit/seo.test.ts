import { beforeAll, describe, expect, it } from "vitest";
import { jsonLdScript, pageDescription, siteMetadata, structuredData } from "@/app/seo";
import type { Site } from "@/features/content";
import { CONTENT_DIR, loadSiteFrom } from "@/features/content/server";

let site: Site;
const base = new URL("https://felistas.co.zw");

beforeAll(async () => {
  site = await loadSiteFrom(CONTENT_DIR);
});

type PersonNode = {
  "@type": string;
  name: string;
  alternateName: string[];
  jobTitle: string;
  sameAs: string[];
  knowsAbout: string[];
  alumniOf: { name: string }[];
};

const person = () =>
  (structuredData(site, base)["@graph"] as { "@type": string }[]).find(
    (n) => n["@type"] === "Person",
  ) as PersonNode;

describe("search metadata", () => {
  it("leads with the full name, role and place", () => {
    const meta = siteMetadata(site, base);
    expect(meta.title).toMatchObject({
      default: "Felistas Charuka · Software Engineer in Harare, Zimbabwe",
    });
    expect(pageDescription(site).length).toBeLessThan(170);
    expect(meta.alternates?.canonical).toBe("/");
    expect(meta.openGraph).toMatchObject({ type: "profile", firstName: "Felistas" });
  });

  it("lets search engines find every spelling and profession", () => {
    const keywords = siteMetadata(site, base).keywords as string[];
    for (const k of ["Felistas Charuka", "Varaidzo Charuka", "software developer", "IT support"]) {
      expect(keywords).toContain(k);
    }
  });

  it("adds the Search Console code only when there is one", () => {
    expect(siteMetadata(site, base).verification).toBeUndefined();
    expect(siteMetadata(site, base, "abc").verification).toEqual({ google: "abc" });
  });
});

describe("structured data", () => {
  it("describes a Person on a ProfilePage, with the alternate names", () => {
    const p = person();
    expect(p.name).toBe("Felistas Charuka");
    expect(p.alternateName).toEqual(
      expect.arrayContaining(["Felistas", "Felistas V Charuka", "Felistas Varaidzo Charuka"]),
    );
    expect(p.jobTitle).toBe("Software Engineer");
    expect(p.sameAs).toEqual(
      expect.arrayContaining([expect.stringContaining("github.com/starpearl03")]),
    );
    expect(p.knowsAbout).toContain("Next.js");
    expect(p.alumniOf[0].name).toBe("University of Zimbabwe");
    const types = (structuredData(site, base)["@graph"] as { "@type": string }[]).map(
      (n) => n["@type"],
    );
    expect(types).toEqual(["Person", "ProfilePage", "WebSite"]);
  });

  it("can't break out of its script tag", () => {
    expect(jsonLdScript({ x: "</script><script>alert(1)</script>" })).not.toContain("<");
  });
});
