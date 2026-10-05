// The site's canonical origin, for metadata, Open Graph and emails.
// A bad NEXT_PUBLIC_SITE_URL must never break the build (it once held just "felistas"), so this falls
// back to the URL Vercel provides, then to localhost, and warns instead of throwing.

type SiteEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  /** Set by Vercel: the production domain, without a scheme */
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  /** Set by Vercel: this deployment's domain, without a scheme */
  VERCEL_URL?: string;
};

const LOCAL = "http://localhost:3000";

/** An absolute http(s) URL whose host is localhost or contains a dot; otherwise null. */
function asOrigin(value: string | undefined, assumeHttps = false): URL | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(assumeHttps && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw);
    const okHost = url.hostname === "localhost" || url.hostname.includes(".");
    return (url.protocol === "https:" || url.protocol === "http:") && okHost
      ? new URL(url.origin)
      : null;
  } catch {
    return null;
  }
}

const warned = new Set<string>();

export function resolveSiteUrl(
  env: SiteEnv = process.env as SiteEnv,
  warn: (message: string) => void = console.warn,
): URL {
  const configured = asOrigin(env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;

  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && !warned.has(raw)) {
    warned.add(raw);
    warn(
      `NEXT_PUBLIC_SITE_URL "${raw}" is not a full URL like https://felistas.dev; using a fallback.`,
    );
  }
  return (
    asOrigin(env.VERCEL_PROJECT_PRODUCTION_URL, true) ??
    asOrigin(env.VERCEL_URL, true) ??
    new URL(LOCAL)
  );
}
