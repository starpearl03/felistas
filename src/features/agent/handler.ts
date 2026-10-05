import "server-only";

import { z } from "zod";
import { SECTION_IDS } from "@/features/content";
import { loadSite } from "@/features/content/server";
import { clientIp, createRateLimiter, type RateLimiter } from "@/lib/rate-limit";
import { respondOffline } from "./offline-agent";
import { type AgentRecord, buildRecord } from "./record";
import { replyResponse } from "./stream";
import type { ContactFlow } from "./types";

export const MAX_INPUT_CHARS = 1_000;
const MAX_BODY_CHARS = 64_000;
/** Only the recent turns matter to the agent */
export const HISTORY = 12;

/** Per visitor: 8 messages a minute and 60 a day. */
export const chatLimiter = createRateLimiter([
  { limit: 8, windowMs: 60 * 1_000 },
  { limit: 60, windowMs: 24 * 60 * 60 * 1_000 },
]);

const flowSchema = z.union([
  z.object({ step: z.literal("email") }),
  z.object({ step: z.literal("message"), email: z.string().max(254) }),
]);

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string().max(100),
        role: z.enum(["user", "assistant", "system"]),
        parts: z.array(z.object({ type: z.string() }).loose()).max(40),
        metadata: z.unknown().optional(),
      }),
    )
    .min(1)
    .max(200),
  pageContext: z
    .object({
      section: z.enum(SECTION_IDS),
      projectId: z.string().max(100).nullable(),
      roleSlug: z.string().max(100).nullable(),
    })
    .optional(),
});

type ChatBody = z.infer<typeof bodySchema>;

export type ChatDeps = {
  limiter: RateLimiter;
  record: () => Promise<AgentRecord>;
  now: () => number;
};

export const defaultChatDeps: ChatDeps = {
  limiter: chatLimiter,
  record: async () => buildRecord(await loadSite()),
  now: Date.now,
};

const error = (status: number, code: string, message: string, headers?: HeadersInit) =>
  Response.json({ ok: false, error: code, message }, { status, headers });

/** The visitor's latest message, as plain text. */
export function lastUserText(messages: ChatBody["messages"]): string | null {
  const last = messages.at(-1);
  if (!last || last.role !== "user") return null;
  const text = last.parts
    .filter(
      (p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string",
    )
    .map((p) => p.text)
    .join(" ")
    .trim();
  return text || null;
}

/** Where the offline contact flow stood after the last assistant reply. */
export function currentFlow(messages: ChatBody["messages"]): ContactFlow | null {
  const assistant = messages.findLast((m) => m.role === "assistant");
  const meta = assistant?.metadata as { flow?: unknown } | undefined;
  const parsed = flowSchema.safeParse(meta?.flow);
  return parsed.success ? parsed.data : null;
}

/** POST /api/chat. P6 answers with the offline agent; P8 adds Gemini in front of it. */
export async function handleChat(request: Request, deps: ChatDeps = defaultChatDeps) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return error(413, "too_large", "The conversation is too long.");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return error(400, "invalid", "The request was not valid.");
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return error(400, "invalid", "The request was not valid.");

  const messages = parsed.data.messages.slice(-HISTORY);
  const text = lastUserText(messages);
  if (!text) return error(400, "invalid", "Send a message to ask Dusk something.");
  if (text.length > MAX_INPUT_CHARS) {
    return error(413, "too_large", `Keep questions under ${MAX_INPUT_CHARS} characters.`);
  }

  const limit = deps.limiter.hit(clientIp(request.headers), deps.now());
  if (!limit.ok) {
    const retryAfter = Math.ceil(limit.retryAfterMs / 1_000);
    return error(429, "rate_limited", "Too many questions at once. Give it a moment.", {
      "Retry-After": String(retryAfter),
    });
  }

  const reply = respondOffline(text, currentFlow(messages), await deps.record());
  return replyResponse(reply, "offline");
}
