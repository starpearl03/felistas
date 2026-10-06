import { expect, type Page, test } from "@playwright/test";
import { motionMenu, pickMotion } from "./motion";

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
  const menu = motionMenu(page);
  await expect(menu).toHaveText("lively");
  await expect(stage(page)).toHaveAttribute("data-motion", "lively");
  // no visible "Motion" label; the menu lists the three levels with the current one selected
  await expect(page.getByText("Motion", { exact: true })).toHaveCount(0);
  await menu.click();
  const list = page.getByRole("listbox", { name: "Motion" });
  await expect(list.getByRole("option")).toHaveCount(3);
  await expect(list.getByRole("option", { selected: true })).toContainText("lively");
  await list.getByRole("option", { name: /calm/ }).click();
  await expect(list).toBeHidden();
  await expect(menu).toHaveText("calm");
  await expect(stage(page)).toHaveAttribute("data-motion", "calm");

  await page.reload();
  await expect(motionMenu(page)).toHaveText("calm");
  await expect(stage(page)).toHaveAttribute("data-motion", "calm");
});

test("the motion menu works from the keyboard and closes on Escape", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard");
  await page.goto("/");
  const menu = motionMenu(page);
  await menu.focus();
  await page.keyboard.press("ArrowDown");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await expect(menu).toHaveText("still");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("starts on still and still draws the stage", async ({ page }) => {
    await page.goto("/");
    await expect(motionMenu(page)).toHaveText("still");
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

    await pickMotion(page, "lively");
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

  await pickMotion(page, "still");
  await page.mouse.click(sky.x, sky.y);
  await expect(stage(page)).toHaveAttribute("data-ripple", "1");
});
