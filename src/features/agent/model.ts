import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { APICallError, type LanguageModel, RetryError } from "ai";
import { env } from "@/lib/env";
import { createRateLimiter } from "@/lib/rate-limit";
import { embedQuery } from "./rag/embed";

/** What a live answer needs; null means answer offline. */
export type LiveModel = {
  model: LanguageModel;
  embedQuery: (query: string) => Promise<number[]>;
  onModelError: (error: unknown) => void;
};

/**
 * The whole site's share of the free Gemini tier, below its published limits, so one busy day
 * degrades to offline answers instead of failing. Per-visitor limits are in the chat handler.
 */
export const liveBudget = createRateLimiter([
  { limit: 8, windowMs: 60 * 1_000 },
  { limit: 200, windowMs: 24 * 60 * 60 * 1_000 },
]);

/** After a 429 the model is left alone for a minute. */
export const COOLDOWN_MS = 60 * 1_000;
let coolUntil = 0;

/** A 429, also when it arrives wrapped after the SDK's retry */
export function isRateLimit(error: unknown): boolean {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  return APICallError.isInstance(cause) && cause.statusCode === 429;
}

/** Pauses live answers after a rate limit; other failures just fall back for that one reply. */
export function noteModelError(error: unknown, now = Date.now()) {
  if (isRateLimit(error)) coolUntil = now + COOLDOWN_MS;
  console.warn(`chat: the model failed, answering offline. ${(error as Error)?.message ?? error}`);
}

/** The Gemini model, or null without a key, while cooling down, or when the budget is spent. */
export function liveModel(now = Date.now()): LiveModel | null {
  const { GEMINI_API_KEY: apiKey, GEMINI_MODEL: modelId } = env();
  if (!apiKey || now < coolUntil) return null;
  if (!liveBudget.hit("site", now).ok) return null;
  return {
    model: createGoogleGenerativeAI({ apiKey })(modelId),
    embedQuery: (q) => embedQuery(q, apiKey),
    onModelError: (error) => noteModelError(error),
  };
}
