import { describe, expect, it } from "vitest";
import { parseEnv, parseEnvLenient } from "@/lib/env";

describe("parseEnv", () => {
  it("accepts an empty environment and defaults the model", () => {
    const env = parseEnv({});
    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.GEMINI_MODEL).toBe("gemini-flash-lite-latest");
  });

  it("treats blank values as unset", () => {
    expect(parseEnv({ GEMINI_API_KEY: "  ", RESEND_API_KEY: "" })).toMatchObject({
      GEMINI_API_KEY: undefined,
      RESEND_API_KEY: undefined,
    });
  });

  it("rejects a malformed contact email", () => {
    expect(() => parseEnv({ CONTACT_TO_EMAIL: "not-an-email" })).toThrow(/CONTACT_TO_EMAIL/);
    expect(() => parseEnv({ CONTACT_FROM_EMAIL: "Dusk noreply" })).toThrow(/CONTACT_FROM_EMAIL/);
    expect(
      parseEnv({ CONTACT_FROM_EMAIL: "Dusk <noreply@felistas.co.zw>" }).CONTACT_FROM_EMAIL,
    ).toBe("Dusk <noreply@felistas.co.zw>");
    expect(parseEnv({ CONTACT_FROM_EMAIL: "noreply@felistas.co.zw" }).CONTACT_FROM_EMAIL).toBe(
      "noreply@felistas.co.zw",
    );
  });

  it("leaves the site url to resolveSiteUrl, so a bad value cannot break the build", () => {
    expect(parseEnv({ NEXT_PUBLIC_SITE_URL: "felistas" }).NEXT_PUBLIC_SITE_URL).toBe("felistas");
  });

  it("accepts values pasted with their quotes, as Vercel keeps them", () => {
    const env = parseEnv({
      CONTACT_FROM_EMAIL: '"Dusk <noreply@felistas.co.zw>"',
      CONTACT_TO_EMAIL: "'felistas03charuka@gmail.com'",
      RESUME_URL:
        ' "https://raw.githubusercontent.com/starpearl03/resume/main/felistas-resume.pdf" ',
    });
    expect(env.CONTACT_FROM_EMAIL).toBe("Dusk <noreply@felistas.co.zw>");
    expect(env.CONTACT_TO_EMAIL).toBe("felistas03charuka@gmail.com");
    expect(env.RESUME_URL).toBe(
      "https://raw.githubusercontent.com/starpearl03/resume/main/felistas-resume.pdf",
    );
  });
});

describe("parseEnvLenient (what the pages use)", () => {
  it("ignores a bad variable with a warning instead of breaking the build", () => {
    const warnings: string[] = [];
    const env = parseEnvLenient(
      { CONTACT_FROM_EMAIL: "Dusk noreply", RESUME_URL: "not a url", GEMINI_API_KEY: "k" },
      (m) => warnings.push(m),
    );
    expect(env.CONTACT_FROM_EMAIL).toBeUndefined();
    expect(env.RESUME_URL).toBeUndefined();
    expect(env.GEMINI_API_KEY).toBe("k");
    expect(warnings.join(" ")).toMatch(/CONTACT_FROM_EMAIL/);
    expect(warnings.join(" ")).toMatch(/RESUME_URL/);
  });
});
