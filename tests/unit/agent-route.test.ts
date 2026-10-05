import { beforeAll, describe, expect, it } from "vitest";
import { type AgentRecord, buildRecord } from "@/features/agent";
import {
  type ChatDeps,
  currentFlow,
  handleChat,
  lastUserText,
  MAX_INPUT_CHARS,
} from "@/features/agent/server";
import { CONTENT_DIR, loadSiteFrom } from "@/features/content/server";
import { createRateLimiter } from "@/lib/rate-limit";

let record: AgentRecord;
beforeAll(async () => {
  record = buildRecord(await loadSiteFrom(CONTENT_DIR));
});

const deps = (): ChatDeps => ({
  limiter: createRateLimiter([{ limit: 2, windowMs: 60_000 }]),
  record: async () => record,
  now: () => 1_000,
});

const userMsg = (text: string, id = "u1") => ({
  id,
  role: "user",
  parts: [{ type: "text", text }],
});

const post = (body: unknown) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("message helpers", () => {
  it("reads the visitor's latest text", () => {
    expect(lastUserText([userMsg("hi") as never])).toBe("hi");
    expect(lastUserText([{ id: "a", role: "assistant", parts: [] } as never])).toBeNull();
  });

  it("reads the contact flow from the last reply's metadata, ignoring junk", () => {
    const reply = (metadata: unknown) => ({
      id: "a",
      role: "assistant" as const,
      parts: [],
      metadata,
    });
    expect(currentFlow([reply({ flow: { step: "email" } })])).toEqual({ step: "email" });
    expect(currentFlow([reply({ flow: { step: "nope" } })])).toBeNull();
    expect(currentFlow([reply(undefined)])).toBeNull();
  });
});

describe("POST /api/chat", () => {
  it("streams the offline reply: tool calls first, then the text, then metadata", async () => {
    const res = await handleChat(post({ messages: [userMsg("show projects")] }), deps());
    expect(res.status).toBe(200);
    const body = await res.text();
    const nav = body.indexOf('"tool-input-available"');
    const text = body.indexOf('"text-delta"');
    expect(nav).toBeGreaterThan(-1);
    expect(text).toBeGreaterThan(nav);
    expect(body).toContain('"toolName":"navigate"');
    expect(body).toContain('"mode":"offline"');
  });

  it("continues the contact flow from the previous reply's metadata", async () => {
    const res = await handleChat(
      post({
        messages: [
          { id: "a", role: "assistant", parts: [], metadata: { flow: { step: "email" } } },
          userMsg("ada@acme.com"),
        ],
      }),
      deps(),
    );
    expect(await res.text()).toContain('"flow":{"step":"message","email":"ada@acme.com"}');
  });

  it("keeps answering a long conversation by reading only the recent turns", async () => {
    const history = Array.from({ length: 300 }, (_, i) =>
      i % 2
        ? { id: `a${i}`, role: "assistant", parts: [{ type: "text", text: "x".repeat(400) }] }
        : userMsg("hi", `u${i}`),
    );
    const res = await handleChat(
      post({ messages: [...history, userMsg("show projects", "last")] }),
      deps(),
    );
    expect(res.status).toBe(200);
  });

  it("rejects bad bodies, empty asks and long questions", async () => {
    expect((await handleChat(post("{"), deps())).status).toBe(400);
    expect((await handleChat(post({ messages: [] }), deps())).status).toBe(400);
    expect(
      (await handleChat(post({ messages: [{ id: "a", role: "assistant", parts: [] }] }), deps()))
        .status,
    ).toBe(400);
    expect(
      (await handleChat(post({ messages: [userMsg("x".repeat(MAX_INPUT_CHARS + 1))] }), deps()))
        .status,
    ).toBe(413);
  });

  it("rate-limits per visitor", async () => {
    const d = deps();
    for (let i = 0; i < 2; i++) {
      expect((await handleChat(post({ messages: [userMsg("hi")] }), d)).status).toBe(200);
    }
    const res = await handleChat(post({ messages: [userMsg("hi")] }), d);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });
});
