import { z } from "zod";

// The contact message, shared by the draft card (client) and POST /api/contact (server).

/** A real person takes at least this long between seeing the letter and sending it. */
export const MIN_FILL_MS = 3_000;
/** A form open longer than this is stale (or a replayed request). */
export const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1_000;
export const MAX_MESSAGE_LENGTH = 2_000;

const EMAIL_HINT = "Add an email address so Felistas can reply, like you@company.com.";
const MESSAGE_HINT = "Write a short message.";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

export const contactSchema = z.strictObject({
  replyTo: z.email({ error: EMAIL_HINT }).max(254, EMAIL_HINT),
  name: optionalText(80),
  company: optionalText(80),
  topic: optionalText(160),
  message: z
    .string({ error: MESSAGE_HINT })
    .trim()
    .min(1, MESSAGE_HINT)
    .max(MAX_MESSAGE_LENGTH, `Keep the message under ${MAX_MESSAGE_LENGTH} characters.`),
  /** Honeypot: a field people never see. Bots fill it in. */
  website: z.string().max(200).default(""),
  /**
   * How long the form was open, in ms, measured by the browser with performance.now(). A duration,
   * not a timestamp, so the visitor's clock being wrong cannot trip the time trap.
   */
  elapsedMs: z.number().int().nonnegative(),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactMessage = z.output<typeof contactSchema>;

export type TrapResult = "ok" | "honeypot" | "too-fast" | "stale";

/** Spam checks that run after validation. */
export function checkTraps(msg: ContactMessage): TrapResult {
  if (msg.website.trim() !== "") return "honeypot";
  if (msg.elapsedMs < MIN_FILL_MS) return "too-fast";
  if (msg.elapsedMs > MAX_FORM_AGE_MS) return "stale";
  return "ok";
}

/** Every error the endpoint can return, so the client can show the right words. */
export const CONTACT_ERRORS = {
  invalid: "Some of the message is missing or not valid.",
  too_large: "The message is too long to send.",
  too_fast: "That was quick. Wait a moment and send again.",
  rate_limited: "Too many messages from here. Try again a little later.",
  not_configured: "Sending is not set up yet. Email Felistas directly instead.",
  send_failed: "The message could not be sent. Try again, or email Felistas directly.",
} as const;

export type ContactErrorCode = keyof typeof CONTACT_ERRORS;

export type ContactResponse =
  | { ok: true }
  | {
      ok: false;
      error: ContactErrorCode;
      message: string;
      fields?: Record<string, string>;
      retryAfter?: number;
    };
