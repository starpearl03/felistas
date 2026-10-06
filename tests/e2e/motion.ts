import { expect, type Page } from "@playwright/test";

type Level = "still" | "calm" | "lively";

/** The motion drop-down in the top bar. */
export const motionMenu = (page: Page) => page.getByRole("combobox", { name: "Motion" });

/** Picks a motion level from the drop-down, as a visitor would. */
export async function pickMotion(page: Page, level: Level): Promise<void> {
  await motionMenu(page).click();
  await page.getByRole("listbox", { name: "Motion" }).getByRole("option", { name: level }).click();
  await expect(motionMenu(page)).toHaveText(level);
}
