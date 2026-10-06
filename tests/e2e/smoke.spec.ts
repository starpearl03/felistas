import { expect, test } from "@playwright/test";

test("home page has the name as its h1 and never scrolls sideways", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /^Felistas Charuka, Software Engineer/ }),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("tablets and unfolded phones get the full layout with the companion column", async ({
  page,
}) => {
  for (const [width, height, nav] of [
    [690, 840, false],
    [768, 1024, false],
    [820, 1180, true],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const companion = page.getByRole("complementary", { name: /Dusk/ });
    const box = await companion.boundingBox();
    // a full-height column on the left, not a bottom sheet
    expect(box?.x).toBe(0);
    expect(box?.height).toBeGreaterThan(height * 0.9);
    expect(box?.width).toBeLessThan(width * 0.45);
    await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible({ visible: nav });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
});
