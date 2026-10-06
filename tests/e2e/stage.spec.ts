import { expect, type Page, test } from "@playwright/test";

const stage = (page: Page) => page.locator("[data-stage]");

/** True once a canvas has drawn at least one non-transparent pixel. */
const hasPaint = (page: Page, layer: "glyphs" | "sphere") =>
  page.evaluate((l) => {
    const canvas = document.querySelector<HTMLCanvasElement>(`canvas[data-layer="${l}"]`);
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !canvas.width || !canvas.height) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4 * 97) if (data[i] > 0) return true;
    return false;
  }, layer);

/** A cheap hash of the sphere canvas, to tell whether it is still animating. */
const fingerprint = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-layer="sphere"]');
    const data = canvas?.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
    if (!data) return 0;
    let h = 0;
    for (let i = 0; i < data.length; i += 4 * 31) h = (h * 31 + data[i + 3]) | 0;
    return h;
  });

test("the glyph field and the sphere render on the intro", async ({ page }) => {
  await page.goto("/");
  await expect(stage(page)).toHaveAttribute("data-shape", "sphere");
  await expect.poll(() => hasPaint(page, "glyphs")).toBe(true);
  await expect.poll(() => hasPaint(page, "sphere")).toBe(true);
});

test("starts on lively and remembers the visitor's motion choice", async ({ page }) => {
  await page.goto("/");
  const motion = page.getByRole("combobox", { name: "Motion" });
  await expect(motion).toHaveValue("lively");
  await expect(stage(page)).toHaveAttribute("data-motion", "lively");
  // a drop-down with all three levels, and no visible "Motion" label
  await expect(motion.getByRole("option")).toHaveText(["Still", "Calm", "Lively"]);
  await expect(page.getByText("Motion", { exact: true })).toHaveCount(0);

  await motion.selectOption("calm");
  await expect(motion).toHaveValue("calm");
  await expect(stage(page)).toHaveAttribute("data-motion", "calm");

  await page.reload();
  await expect(page.getByRole("combobox", { name: "Motion" })).toHaveValue("calm");
  await expect(stage(page)).toHaveAttribute("data-motion", "calm");
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("starts on still and still draws the stage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("combobox", { name: "Motion" })).toHaveValue("still");
    await expect(stage(page)).toHaveAttribute("data-motion", "still");
    await expect.poll(() => hasPaint(page, "glyphs")).toBe(true);
  });

  test("animates continuously once the visitor picks lively", async ({ page }) => {
    await page.goto("/");
    await expect(stage(page)).toHaveAttribute("data-motion", "still");
    await expect.poll(() => hasPaint(page, "sphere")).toBe(true);

    // On Still with reduced motion nothing moves without input
    const before = await fingerprint(page);
    await page.waitForTimeout(600);
    expect(await fingerprint(page)).toBe(before);

    await page.getByRole("combobox", { name: "Motion" }).selectOption("lively");
    const start = await fingerprint(page);
    await expect.poll(() => fingerprint(page), { timeout: 3000 }).not.toBe(start);
  });
});

test("a click on the background sends a shockwave; controls and Still do not", async ({ page }) => {
  await page.goto("/");
  await expect(stage(page)).toHaveAttribute("data-motion", "lively");
  // the empty sky of the intro: below the top bar, above the copy, at the right edge
  const { width } = page.viewportSize() ?? { width: 0 };
  const sky = { x: width - 16, y: 130 };
  await page.mouse.click(sky.x, sky.y);
  await expect(stage(page)).toHaveAttribute("data-ripple", "1");

  await page.getByRole("combobox", { name: "Motion" }).selectOption("still");
  await page.mouse.click(sky.x, sky.y);
  await expect(stage(page)).toHaveAttribute("data-ripple", "1");
});
