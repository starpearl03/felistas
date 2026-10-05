import { expect, type Page, test } from "@playwright/test";

const stage = (page: Page) => page.locator("[data-stage]");
const heading = (page: Page, id: string) => page.locator(`[data-sec="${id}"] [data-fly]`);

/** Jumps the scroller to a section, the way any navigation ends up. */
const goTo = (page: Page, id: string) =>
  page.evaluate((sec) => {
    const sc = document.querySelector<HTMLElement>("[data-scroller]")!;
    sc.style.scrollBehavior = "auto";
    sc.scrollTop = sc.querySelector<HTMLElement>(`[data-sec="${sec}"]`)!.offsetTop;
  }, id);

test.describe("on lively", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(stage(page)).toHaveAttribute("data-motion", "lively");
  });

  test("entering a section reshapes the sphere and flies its heading in", async ({ page }) => {
    await expect(heading(page, "projects")).toHaveClass(/flying/);
    await goTo(page, "projects");
    await expect(stage(page)).toHaveAttribute("data-shape", "cube");
    await expect(heading(page, "projects")).not.toHaveClass(/flying/, { timeout: 3000 });
    await expect(heading(page, "projects")).toHaveCSS("opacity", "1");
  });

  test("each section has its own form", async ({ page }) => {
    for (const [id, shape] of [
      ["about", "torus"],
      ["experience", "helix"],
      ["education", "ring"],
      ["contact", "sphere"],
    ]) {
      await goTo(page, id);
      await expect(stage(page)).toHaveAttribute("data-shape", shape);
    }
  });

  test("leaving a section hides its heading so it flies again next time", async ({ page }) => {
    await goTo(page, "projects");
    await expect(heading(page, "projects")).not.toHaveClass(/flying/, { timeout: 3000 });
    await goTo(page, "experience");
    await expect(stage(page)).toHaveAttribute("data-section", "experience");
    await expect(heading(page, "projects")).toHaveClass(/flying/);
  });

  test("hovering a project spells its name in the glyph field", async ({ page, isMobile }) => {
    test.skip(isMobile, "hover needs a pointer");
    await goTo(page, "projects");
    await page.getByRole("button", { name: /Atlas/ }).hover();
    await expect(stage(page)).toHaveAttribute("data-flash", "ATLAS");
  });
});

test.describe("on still", () => {
  test("headings are never hidden and shapes change without a burst", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "still" }).click();
    await expect(page.locator("[data-fly].flying")).toHaveCount(0);
    await goTo(page, "projects");
    await expect(stage(page)).toHaveAttribute("data-shape", "cube");
    await expect(page.locator("[data-fly].flying")).toHaveCount(0);
    await expect(heading(page, "projects")).toHaveCSS("opacity", "1");
  });

  test("switching back to lively re-arms the other headings", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "still" }).click();
    await page.getByRole("button", { name: "lively" }).click();
    await expect(heading(page, "education")).toHaveClass(/flying/);
  });
});
