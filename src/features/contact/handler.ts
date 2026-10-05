import "server-only";

import { parseEnv } from "@/lib/env";
import { clientIp, createRateLimiter, type RateLimiter } from "@/lib/rate-limit";
import {
  checkTraps,
  CONTACT_ERRORS,
  type ContactErrorCode,
  type ContactResponse,
  contactSchema,
} from "./schema";
import { type MailConfig, type Mailer, sendWithResend } from "./send";

/** Request bodies above this are refused before parsing. */
export const MAX_BODY_CHARS = 10_000;

export type ContactDeps = {
  mailer: Mailer;
  limiter: RateLimiter;
  /** null when sending is not configured */
  config: () => MailConfig | null;
  now: () => number;
  log: (event: string, detail?: Record<string, unknown>) => void;
};

/** Per visitor: 3 messages in 10 minutes and 10 a day. */
export const contactLimiter = createRateLimiter([
  { limit: 3, windowMs: 10 * 60 * 1_000 },
  { limit: 10, windowMs: 24 * 60 * 60 * 1_000 },
]);

/** Reads the mail settings from the environment on each request. */
export function mailConfigFromEnv(): MailConfig | null {
  const env = parseEnv(process.env);
  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) return null;
  const site = env.NEXT_PUBLIC_SITE_URL ? new URL(env.NEXT_PUBLIC_SITE_URL).host : "the portfolio";
  return {
    apiKey: env.RESEND_API_KEY,
    to: env.CONTACT_TO_EMAIL,
    from: env.CONTACT_FROM_EMAIL,
    site,
  };
}

export const defaultContactDeps: ContactDeps = {
  mailer: sendWithResend,
  limiter: contactLimiter,
  config: mailConfigFromEnv,
  now: Date.now,
  log: (event, detail) => console.warn(`contact: ${event}`, detail ?? ""),
};

const json = (status: number, body: ContactResponse, headers?: HeadersInit) =>
  Response.json(body, { status, headers });

type FailExtra = { fields?: Record<string, string>; retryAfter?: number };

const fail = (status: number, error: ContactErrorCode, extra?: FailExtra, headers?: HeadersInit) =>
  json(status, { ok: false, error, message: CONTACT_ERRORS[error], ...extra }, headers);

/** POST /api/contact. Only the visitor's Send click on a draft calls this; the model never can. */
export async function handleContact(
  request: Request,
  deps: ContactDeps = defaultContactDeps,
): Promise<Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return fail(413, "too_large");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "invalid");
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "body");
      fields[key] ??= issue.message;
    }
    return fail(400, "invalid", { fields });
  }

  const trap = checkTraps(parsed.data, deps.now());
  // A filled honeypot looks like success to the bot, and nothing is sent
  if (trap === "honeypot") {
    deps.log("honeypot");
    return json(200, { ok: true });
  }
  if (trap === "too-fast") return fail(422, "too_fast");
  if (trap === "stale")
    return fail(400, "invalid", { fields: { renderedAt: "The form expired." } });

  const config = deps.config();
  if (!config) return fail(503, "not_configured");

  const limit = deps.limiter.hit(clientIp(request.headers), deps.now());
  if (!limit.ok) {
    const retryAfter = Math.ceil(limit.retryAfterMs / 1_000);
    return fail(429, "rate_limited", { retryAfter }, { "Retry-After": String(retryAfter) });
  }

  const result = await deps.mailer(parsed.data, config);
  if (!result.ok) {
    deps.log("send failed", { reason: result.reason });
    return fail(502, "send_failed");
  }
  return json(200, { ok: true });
}
