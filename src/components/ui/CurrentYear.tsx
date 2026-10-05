"use client";

/**
 * The visitor's current year. The page is prerendered at build time, so a server-rendered year
 * would freeze; this renders the build year in HTML and the live year once hydrated.
 */
export function CurrentYear() {
  return <span suppressHydrationWarning>{new Date().getFullYear()}</span>;
}
