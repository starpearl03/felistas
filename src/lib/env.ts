import "server-only";
import { z } from "zod";

// Every variable is optional at boot so the site runs without keys (offline agent, no email).
// Code that needs a value checks for it where it is used. See .env.example.
const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const envSchema = z.object({
  GEMINI_API_KEY: optional,
  GEMINI_MODEL: optional.transform((v) => v ?? "gemini-flash-lite-latest"),
  RESEND_API_KEY: optional,
  CONTACT_TO_EMAIL: optional.pipe(z.email().optional()),
  CONTACT_FROM_EMAIL: optional,
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

let cached: Env | undefined;

/** Validated server environment, parsed once per process. */
export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
