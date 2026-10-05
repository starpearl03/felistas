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

test("the glyph field and the sphere render on the intro", async ({ page }) => {
  await page.goto("/");
  await expect(stage(page)).toHaveAttribute("data-shape", "sphere");
  await expect.poll(() => hasPaint(page, "glyphs")).toBe(true);
  await expect.poll(() => hasPaint(page, "sphere")).toBe(true);
});

test("starts on lively and remembers the visitor's motion choice", async ({ page }) => {
  await page.goto("/");
  const group = page.getByRole("group", { name: "Motion" });
  await expect(group.getByRole("button", { name: "lively" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(stage(page)).toHaveAttribute("data-motion", "lively");

  await group.getByRole("button", { name: "calm" }).click();
  await expect(group.getByRole("button", { name: "calm" })).toHaveAttribute("aria-pressed", "true");
  await expect(stage(page)).toHaveAttribute("data-motion", "calm");

  await page.reload();
  await expect(page.getByRole("button", { name: "calm" })).toHaveAttribute("aria-pressed", "true");
  await expect(stage(page)).toHaveAttribute("data-motion", "calm");
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("starts on still and still draws the stage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "still" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(stage(page)).toHaveAttribute("data-motion", "still");
    await expect.poll(() => hasPaint(page, "glyphs")).toBe(true);
  });
});
