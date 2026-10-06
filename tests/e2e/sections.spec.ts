import { expect, type Page, test } from "@playwright/test";

const stage = (page: Page) => page.locator("[data-stage]");
const section = (page: Page, id: string) => page.locator(`[data-sec="${id}"]`);

test.beforeEach(async ({ page }) => {
  // Instant scrolling keeps the assertions about where the page landed deterministic
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
});

test("renders every section in order", async ({ page }) => {
  const ids = await page
    .locator("[data-scroller] > [data-sec]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-sec")));
  expect(ids).toEqual(["home", "about", "projects", "experience", "education", "contact"]);
});

test("see the work scrolls to projects and the page follows", async ({ page }) => {
  await page.getByRole("button", { name: "See the work" }).click();
  await expect(stage(page)).toHaveAttribute("data-section", "projects");
  await expect(section(page, "projects")).toBeInViewport({ ratio: 0.6 });
});

test("projects: hovering, clicking and focusing a name fills the detail", async ({ page }) => {
  await page.getByRole("button", { name: "See the work" }).click();
  const detail = page.locator("#project-detail");
  await expect(detail).toContainText("phishing detection system");

  await page.getByRole("button", { name: /^\d{4} Sentinel/ }).hover();
  await expect(detail).toContainText("final-year project");
  await expect(page.getByRole("button", { name: /^\d{4} Sentinel/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: /^\d{4} Staff Portal/ }).focus();
  await expect(detail).toContainText("each team sees only its own data");
});

test("experience: the ruler starts on the latest role and selects lanes", async ({ page }) => {
  const detail = page.locator("#role-detail");
  await expect(detail).toContainText("IT & Software Intern");
  await page.getByRole("button", { name: /Software Developer Intern at Melsoft/ }).click();
  await expect(detail).toContainText("school management modules");
});

test("contact shows the email with a copy action", async ({ page }) => {
  const email = section(page, "contact").getByRole("link", { name: "dev@felistas.co.zw" });
  await expect(email).toHaveAttribute("href", "mailto:dev@felistas.co.zw");
  await expect(section(page, "contact").getByRole("button", { name: /Copy/ })).toBeVisible();
});

test("no section scrolls sideways", async ({ page }) => {
  for (const id of ["about", "projects", "experience", "education", "contact"]) {
    await page.evaluate((sec) => {
      const sc = document.querySelector<HTMLElement>("[data-scroller]")!;
      sc.scrollTop = sc.querySelector<HTMLElement>(`[data-sec="${sec}"]`)!.offsetTop;
    }, id);
    const overflow = await page.evaluate(() => {
      const sc = document.querySelector<HTMLElement>("[data-scroller]")!;
      return Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        sc.scrollWidth - sc.clientWidth,
      );
    });
    expect(overflow, id).toBeLessThanOrEqual(0);
  }
});

test.describe("desktop navigation", () => {
  test.skip(({ isMobile }) => isMobile, "the section nav is hidden on phones");

  test("the nav scrolls to each section and marks it current", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Sections" });
    for (const [label, id] of [
      ["Experience", "experience"],
      ["Education", "education"],
      ["About", "about"],
    ]) {
      await nav.getByRole("button", { name: label, exact: true }).click();
      await expect(stage(page)).toHaveAttribute("data-section", id);
      await expect(nav.getByRole("button", { name: label, exact: true })).toHaveAttribute(
        "aria-current",
        "true",
      );
    }
  });

  test("keyboard reaches the nav before the content", async ({ page }) => {
    await page.keyboard.press("Tab");
    await expect(
      page
        .getByRole("navigation", { name: "Sections" })
        .getByRole("button", { name: "About", exact: true }),
    ).toBeFocused();
  });
});

test("the scroll progress line grows as the page scrolls", async ({ page }) => {
  const progress = page.locator("[data-progress]");
  const scale = () =>
    progress.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a);
  expect(await scale()).toBeLessThan(0.05);
  await page.evaluate(() => {
    const sc = document.querySelector<HTMLElement>("[data-scroller]")!;
    sc.scrollTop = sc.scrollHeight;
  });
  await expect.poll(scale).toBeGreaterThan(0.95);
});

test.describe("on still without the OS reduced-motion setting", () => {
  test.skip(({ isMobile }) => isMobile, "uses the desktop nav");

  test("navigation jumps instantly", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await page.getByRole("button", { name: "still" }).click();
    const landed = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Sections"]')!;
      const button = [...nav.querySelectorAll("button")].find((b) => b.textContent === "Contact")!;
      button.click();
      const sc = document.querySelector<HTMLElement>("[data-scroller]")!;
      const target = sc.querySelector<HTMLElement>('[data-sec="contact"]')!;
      // read back in the same task: an instant scroll has already arrived, a smooth one has not
      return Math.abs(sc.scrollTop - Math.min(target.offsetTop, sc.scrollHeight - sc.clientHeight));
    });
    expect(landed).toBeLessThan(2);
  });
});
