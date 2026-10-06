import "server-only";
import { z } from "zod";

// Every variable is optional at boot so the site runs without keys (offline agent, no email).
// Code that needs a value checks for it where it is used. See .env.example.

/** Removes one pair of surrounding quotes: dashboards like Vercel keep them as part of the value. */
export const unquote = (v: string): string => {
  const t = v.trim();
  return t.length >= 2 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0]
    ? t.slice(1, -1).trim()
    : t;
};

const optional = z
  .string()
  .transform((v) => {
    const value = unquote(v);
    return value === "" ? undefined : value;
  })
  .optional();

export const envSchema = z.object({
  GEMINI_API_KEY: optional,
  GEMINI_MODEL: optional.transform((v) => v ?? "gemini-flash-lite-latest"),
  RESEND_API_KEY: optional,
  /** Felistas's inbox: visitor messages arrive here, and the visitor's receipt replies here */
  CONTACT_TO_EMAIL: optional.pipe(z.email().optional()),
  /** The sender of every email: "noreply@felistas.co.zw" or "Dusk <noreply@felistas.co.zw>" */
  CONTACT_FROM_EMAIL: optional.pipe(
    z
      .string()
      .refine((v) => z.email().safeParse(v.match(/<([^<>]+)>$/)?.[1] ?? v).success, {
        message: 'expected an address like "Dusk <noreply@felistas.co.zw>"',
      })
      .optional(),
  ),
  /** Where the resume PDF lives; overrides resume.source in content/profile.md */
  RESUME_URL: optional.pipe(z.url({ protocol: /^https$/ }).optional()),
  /** Google Search Console's HTML-tag verification code, if the site is verified that way */
  GOOGLE_SITE_VERIFICATION: optional,
  /** Bing Webmaster Tools' meta-tag (msvalidate.01) verification code */
  BING_SITE_VERIFICATION: optional,
  // Not validated here: a bad value must not break the build. resolveSiteUrl() checks it and falls back.
  NEXT_PUBLIC_SITE_URL: optional,
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment variables: ${issues}`);
  }
  return result.data;
}

/**
 * Like parseEnv, but a bad variable is reported through `warn` and treated as unset instead of
 * throwing, so one mistyped value can never break the build or the pages. Code that depends on it
 * (email, Gemini) then behaves as if it were missing.
 */
export function parseEnvLenient(
  source: Record<string, string | undefined>,
  warn: (message: string) => void = console.warn,
): Env {
  const input = { ...source };
  for (let attempt = 0; attempt <= Object.keys(envSchema.shape).length; attempt++) {
    const result = envSchema.safeParse(input);
    if (result.success) return result.data;
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      warn(`Ignoring environment variable ${key}: ${issue.message}`);
      delete input[key];
    }
  }
  return envSchema.parse({});
}

let cached: Env | undefined;

/** The server environment, parsed once per process. Bad values are warned about and ignored. */
export function env(): Env {
  cached ??= parseEnvLenient(process.env);
  return cached;
}
