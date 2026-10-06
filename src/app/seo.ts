// Search metadata and structured data (schema.org JSON-LD), built from content like everything else.
// The alternate names in profile.seo (e.g. the middle name) reach search engines through the keywords
// and the Person's alternateName only; the page itself never shows them.
import type { Metadata } from "next";
import type { Site } from "@/features/content";

/** "Felistas Charuka, Software Engineer in Harare, Zimbabwe" */
export const pageTitle = (site: Site) =>
  `${site.profile.fullName} · ${site.profile.role} in ${site.profile.location}`;

/** About 150 characters: who, what and where, then the line. */
export const pageDescription = ({ profile }: Site) =>
  `${profile.fullName}, ${profile.role.toLowerCase()} in ${profile.location}. ${profile.line}`;

export function siteMetadata(site: Site, base: URL, googleVerification?: string): Metadata {
  const { profile } = site;
  const [firstName, ...rest] = profile.fullName.split(" ");
  const title = pageTitle(site);
  const description = pageDescription(site);
  return {
    metadataBase: base,
    title: { default: title, template: `%s · ${profile.fullName}` },
    description,
    applicationName: profile.fullName,
    keywords: profile.seo.keywords,
    authors: [{ name: profile.fullName, url: base.toString() }],
    creator: profile.fullName,
    publisher: profile.fullName,
    category: "technology",
    alternates: { canonical: "/" },
    openGraph: {
      type: "profile",
      firstName,
      lastName: rest.join(" "),
      username: profile.links.github.split("/").filter(Boolean).at(-1),
      url: "/",
      siteName: profile.fullName,
      locale: "en_GB",
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    formatDetection: { email: false, telephone: false, address: false },
    ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  };
}

/** A Person on a ProfilePage, plus the WebSite: what Google uses for a knowledge panel and rich results. */
export function structuredData(site: Site, base: URL) {
  const { profile } = site;
  const url = base.toString();
  const personId = `${url}#person`;
  const [locality, country] = profile.location.split(",").map((s) => s.trim());
  const [givenName, ...family] = profile.fullName.split(" ");
  const skills = site.skills.groups.flatMap((g) => g.items);

  const person = {
    "@type": "Person",
    "@id": personId,
    name: profile.fullName,
    alternateName: [...new Set([profile.name, ...profile.seo.alternateNames])],
    givenName,
    familyName: family.join(" "),
    jobTitle: profile.role,
    description: pageDescription(site),
    url,
    image: new URL("/opengraph-image", base).toString(),
    email: `mailto:${profile.email}`,
    address: { "@type": "PostalAddress", addressLocality: locality, addressCountry: country },
    sameAs: [profile.links.github, profile.links.linkedin],
    knowsAbout: skills,
    knowsLanguage: "en",
    hasOccupation: {
      "@type": "Occupation",
      name: profile.role,
      occupationLocation: { "@type": "City", name: profile.location },
      skills: skills.join(", "),
    },
    alumniOf: site.education.map((e) => ({ "@type": "CollegeOrUniversity", name: e.org })),
    hasCredential: site.education.map((e) => ({
      "@type": "EducationalOccupationalCredential",
      name: e.title,
      credentialCategory: "degree",
      recognizedBy: { "@type": "CollegeOrUniversity", name: e.org },
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@type": "ProfilePage",
        "@id": `${url}#profile`,
        url,
        name: pageTitle(site),
        description: pageDescription(site),
        mainEntity: { "@id": personId },
        about: { "@id": personId },
        inLanguage: "en",
      },
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        url,
        name: profile.fullName,
        publisher: { "@id": personId },
        inLanguage: "en",
      },
    ],
  };
}

/** Safe to inline in a <script>: "<" can never close the tag (Next.js JSON-LD guide). */
export const jsonLdScript = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
