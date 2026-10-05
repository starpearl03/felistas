import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("accepts an empty environment and defaults the model", () => {
    const env = parseEnv({});
    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.GEMINI_MODEL).toBe("gemini-flash-latest");
  });

  it("treats blank values as unset", () => {
    expect(parseEnv({ GEMINI_API_KEY: "  ", RESEND_API_KEY: "" })).toMatchObject({
      GEMINI_API_KEY: undefined,
      RESEND_API_KEY: undefined,
    });
  });

  it("rejects a malformed contact email and site url", () => {
    expect(() => parseEnv({ CONTACT_TO_EMAIL: "not-an-email" })).toThrow(/CONTACT_TO_EMAIL/);
    expect(() => parseEnv({ NEXT_PUBLIC_SITE_URL: "nope" })).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });
});
