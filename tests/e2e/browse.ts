import { expect, type Page } from "@playwright/test";

/**
 * Phones start in the chat with the page waiting behind it (UI-SPEC §9.1). This folds the chat so
 * the page can be used; wider screens always show the page, so there it does nothing.
 */
export async function browse(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: "Browse the page" });
  if (!(await button.isVisible())) return;
  await button.click();
  await expect(page.locator("main")).toBeVisible();
  // park the pointer in the corner: left over the page, it would hover whatever scrolls under it
  await page.mouse.move(0, 0);
}
