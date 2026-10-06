import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmationEmail, notificationEmail } from "@/features/contact/emails/build";
import {
  type ContactDeps,
  contactLimiter,
  handleContact,
  mailConfigFromEnv,
  MAX_BODY_CHARS,
} from "@/features/contact/server";
import { checkTraps, contactSchema, MIN_FILL_MS } from "@/features/contact/schema";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

const NOW = 1_800_000_000_000;

const valid = {
  replyTo: "ada@company.com",
  name: "Ada",
  company: "Company",
  topic: "a senior backend role",
  message: "Hi Felistas, I'd like to talk.",
  website: "",
  elapsedMs: 10_000,
};

const config = {
  apiKey: "re_test",
  to: "inbox@felistas.dev",
  from: "Dusk <dusk@felistas.dev>",
  site: "felistas.dev",
  owner: "Felistas Charuka",
};

function deps(overrides: Partial<ContactDeps> = {}): ContactDeps {
  return {
    mailer: vi.fn(async () => ({ ok: true as const, id: "email_1", confirmed: true })),
    limiter: createRateLimiter([{ limit: 3, windowMs: 600_000 }]),
    config: () => config,
    now: () => NOW,
    log: vi.fn(),
    ...overrides,
  };
}

const post = (body: unknown, ip = "203.0.113.7") =>
  new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1` },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("contactSchema", () => {
  it("accepts a full message and drops blank optional fields", () => {
    const msg = contactSchema.parse({ ...valid, company: "  ", topic: "" });
    expect(msg.company).toBeUndefined();
    expect(msg.topic).toBeUndefined();
  });

  it("requires a valid reply-to email and a message", () => {
    const res = contactSchema.safeParse({ ...valid, replyTo: "nope", message: "  " });
    expect(res.success).toBe(false);
    const paths = res.success ? [] : res.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["replyTo", "message"]));
  });

  it("explains missing fields in plain words", () => {
    const res = contactSchema.safeParse({ elapsedMs: 5_000 });
    const messages = res.success ? [] : res.error.issues.map((i) => i.message);
    expect(messages).toContain("Write a short message.");
    expect(messages.some((m) => m.startsWith("Add an email address"))).toBe(true);
  });

  it("rejects unknown fields and overlong messages", () => {
    expect(contactSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, message: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("checkTraps", () => {
  const msg = contactSchema.parse(valid);
  it("passes a person who took a few seconds", () => expect(checkTraps(msg)).toBe("ok"));
  it("catches a filled honeypot", () =>
    expect(checkTraps({ ...msg, website: "http://spam" })).toBe("honeypot"));
  it("catches instant submissions", () =>
    expect(checkTraps({ ...msg, elapsedMs: MIN_FILL_MS - 1 })).toBe("too-fast"));
  it("catches stale forms", () =>
    expect(checkTraps({ ...msg, elapsedMs: 2 * 86_400_000 })).toBe("stale"));
});

describe("contact emails (React Email templates)", () => {
  const hostile = () =>
    contactSchema.parse({ ...valid, name: "<b>Eve</b>", message: "<script>x</script>\nline two" });

  it("tells Felistas who wrote and what, with visitor text escaped", async () => {
    const email = await notificationEmail(hostile(), "felistas.co.zw");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("ada@company.com");
    expect(email.text).toContain("<script>x</script>");
    expect(email.subject).toBe("Portfolio message from <b>Eve</b> (Company)");
  });

  it("sends the visitor a receipt with a copy of their message", async () => {
    const email = await confirmationEmail(hostile(), "Felistas Charuka", "felistas.co.zw");
    expect(email.subject).toBe("Your message to Felistas Charuka was sent");
    expect(email.html).toContain("Your message reached Felistas Charuka");
    expect(email.html).not.toContain("<script>");
    expect(email.text).toContain("line two");
  });

  it("keeps subjects on one line", async () => {
    const msg = contactSchema.parse({ ...valid, name: "Ada\r\nBcc: x@y.z" });
    expect((await notificationEmail(msg, "s")).subject).not.toMatch(/[\r\n]/);
  });
});

describe("createRateLimiter", () => {
  it("allows up to the limit, then reports when to retry", () => {
    const rl = createRateLimiter([{ limit: 2, windowMs: 1_000 }]);
    expect(rl.hit("a", 0).ok).toBe(true);
    expect(rl.hit("a", 100).ok).toBe(true);
    const third = rl.hit("a", 200);
    // the hit at 0 ms leaves the window at 1000 ms
    expect(third).toEqual({ ok: false, retryAfterMs: 800 });
    expect(rl.hit("b", 200).ok).toBe(true);
    expect(rl.hit("a", 1_001).ok).toBe(true);
  });

  it("refunds a hit that did not go through", () => {
    const rl = createRateLimiter([{ limit: 1, windowMs: 1_000 }]);
    expect(rl.hit("a", 0).ok).toBe(true);
    rl.refund("a", 0);
    expect(rl.hit("a", 10).ok).toBe(true);
    expect(rl.hit("a", 20).ok).toBe(false);
  });

  it("enforces every window", () => {
    const rl = createRateLimiter([
      { limit: 5, windowMs: 1_000 },
      { limit: 2, windowMs: 10_000 },
    ]);
    rl.hit("a", 0);
    rl.hit("a", 2_000);
    expect(rl.hit("a", 4_000).ok).toBe(false);
  });

  it("reads the first forwarded address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("POST /api/contact", () => {
  it("sends a valid message", async () => {
    const d = deps();
    const res = await handleContact(post(valid), d);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, confirmed: true });
    expect(d.mailer).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: "ada@company.com" }),
      config,
    );
  });

  it("refuses bodies that are too large or not JSON", async () => {
    expect((await handleContact(post("x".repeat(MAX_BODY_CHARS + 1)), deps())).status).toBe(413);
    expect((await handleContact(post("{not json"), deps())).status).toBe(400);
  });

  it("returns field errors for invalid input", async () => {
    const res = await handleContact(post({ ...valid, replyTo: "nope" }), deps());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid");
    expect(body.fields.replyTo).toMatch(/email/);
  });

  it("pretends to succeed for a filled honeypot and sends nothing", async () => {
    const d = deps();
    const res = await handleContact(post({ ...valid, website: "spam.example" }), d);
    expect(res.status).toBe(200);
    expect(d.mailer).not.toHaveBeenCalled();
  });

  it("rejects instant submissions", async () => {
    const res = await handleContact(post({ ...valid, elapsedMs: 500 }), deps());
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("too_fast");
  });

  it("says sending is not set up when the keys are missing", async () => {
    const d = deps({ config: () => null });
    const res = await handleContact(post(valid), d);
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("not_configured");
    expect(d.mailer).not.toHaveBeenCalled();
  });

  it("rate-limits per visitor and sets Retry-After", async () => {
    const d = deps();
    for (let i = 0; i < 3; i++) expect((await handleContact(post(valid), d)).status).toBe(200);
    const res = await handleContact(post(valid), d);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("600");
    expect((await handleContact(post(valid, "198.51.100.1"), d)).status).toBe(200);
  });

  it("answers a malformed mail config with a typed 503 and logs it", async () => {
    const d = deps({
      config: () => {
        throw new Error("Invalid environment variables: CONTACT_TO_EMAIL");
      },
    });
    const res = await handleContact(post(valid), d);
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("not_configured");
    expect(d.log).toHaveBeenCalledWith("bad mail config", expect.anything());
  });

  it("does not count failed sends against the visitor", async () => {
    const mailer = vi.fn(async () => ({ ok: false as const, reason: "outage" }));
    const d = deps({ mailer });
    for (let i = 0; i < 5; i++) expect((await handleContact(post(valid), d)).status).toBe(502);
    mailer.mockResolvedValue({ ok: true, id: "email_2" } as never);
    expect((await handleContact(post(valid), d)).status).toBe(200);
  });

  it("reports a failed send without leaking the reason", async () => {
    const d = deps({
      mailer: vi.fn(async () => ({ ok: false as const, reason: "invalid api key" })),
    });
    const res = await handleContact(post(valid), d);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("send_failed");
    expect(JSON.stringify(body)).not.toContain("api key");
    expect(d.log).toHaveBeenCalled();
  });
});

describe("mailConfigFromEnv", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    contactLimiter.reset();
  });

  it("is null until the key, inbox and sender are all set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTACT_TO_EMAIL", "");
    vi.stubEnv("CONTACT_FROM_EMAIL", "");
    expect(await mailConfigFromEnv()).toBeNull();
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("CONTACT_TO_EMAIL", "dev@felistas.co.zw");
    expect(await mailConfigFromEnv()).toBeNull();
    vi.stubEnv("CONTACT_FROM_EMAIL", "Dusk <onboarding@resend.dev>");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://felistas.co.zw");
    expect(await mailConfigFromEnv()).toEqual({
      apiKey: "re_x",
      to: "dev@felistas.co.zw",
      from: "Dusk <onboarding@resend.dev>",
      site: "felistas.co.zw",
      owner: "Felistas Charuka",
    });
  });
});
