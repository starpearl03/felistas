import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const SECTIONS = ["home", "about", "projects", "experience", "education", "contact"] as const;

/** Serious and critical WCAG 2.1 A/AA violations on the page as it is now. */
async function violations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test.beforeEach(async ({ page }) => {
  // still motion: headings and words are settled, so axe sees the final page
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("every section passes axe with no serious or critical issues", async ({ page }) => {
  // six full axe scans: about 20 s on its own, more on a busy machine
  test.setTimeout(90_000);
  await page.goto("/");
  for (const id of SECTIONS) {
    await page.evaluate((sec) => {
      const sc = document.querySelector<HTMLElement>("[data-scroller]")!;
      sc.scrollTop = sc.querySelector<HTMLElement>(`[data-sec="${sec}"]`)!.offsetTop;
    }, id);
    await expect(page.locator("[data-stage]")).toHaveAttribute("data-section", id);
    expect(await violations(page), `section ${id}`).toEqual([]);
  }
});

test("the open conversation passes axe", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#dusk-input");
  await input.click();
  // a question that doesn't move the page, so the phone sheet stays open
  await input.fill("hello");
  await input.press("Enter");
  await expect(page.getByRole("log", { name: "Conversation with Dusk" })).toContainText(
    "Ask me about",
  );
  await input.click();
  expect(await violations(page)).toEqual([]);
});

test("the page is served with security headers and breaks none of them", async ({ page }) => {
  const blocked: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) blocked.push(m.text());
  });
  const res = await page.goto("/");
  const headers = res!.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();
  await expect(page.locator("[data-stage]")).toHaveAttribute("data-section", "home");
  expect(blocked).toEqual([]);
});

test("search engines get metadata, a sitemap and a share image", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/^Felistas Charuka · Software Engineer/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /opengraph-image/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  expect((await request.get("/robots.txt")).ok()).toBe(true);
  expect(await (await request.get("/sitemap.xml")).text()).toContain("<loc>");
  const og = await request.get("/opengraph-image");
  expect(og.headers()["content-type"]).toBe("image/png");
});

test("the resume is served from its repo through our own URL", async ({ request }) => {
  const res = await request.get("/resume/felistas-resume.pdf");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
  expect((await request.get("/resume/someone-else.pdf")).status()).toBe(404);
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/resume/felistas-resume.pdf");
});

test("Google Search Console's verification file is served from the root", async ({ request }) => {
  const res = await request.get("/googlebc5c969621f0344d.html");
  expect(res.status()).toBe(200);
  expect(await res.text()).toBe("google-site-verification: googlebc5c969621f0344d.html");
});

test("search engines get a valid site icon in every format they read", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const links = await page
    .locator('head link[rel="icon"], head link[rel="apple-touch-icon"]')
    .evaluateAll((els) =>
      els.map((el) => ({
        rel: el.getAttribute("rel"),
        href: el.getAttribute("href") ?? "",
        sizes: el.getAttribute("sizes"),
        type: el.getAttribute("type"),
      })),
    );
  // Google shows a square icon whose size is a multiple of 48px; Bing reads /favicon.ico
  const png = links.find((l) => l.type === "image/png" && l.rel === "icon");
  expect(png?.sizes).toBe("192x192");
  expect(links.some((l) => l.href.startsWith("/favicon.ico"))).toBe(true);
  expect(links.some((l) => l.type === "image/svg+xml")).toBe(true);
  expect(links.some((l) => l.rel === "apple-touch-icon" && l.sizes === "180x180")).toBe(true);

  for (const { href } of links) expect((await request.get(href)).status(), href).toBe(200);
  for (const path of ["/favicon.ico", "/icon-512.png", "/icon-maskable-512.png"]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual([
    "192x192",
    "512x512",
    "512x512",
  ]);
});
