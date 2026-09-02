import { expect, test } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";

test.describe("M9 demo CV pagination", () => {
  test.setTimeout(6 * 60_000);

  test("every selectable template keeps the normal demo CV compact without an almost-empty continuation", async ({
    page,
  }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });

    const download = page.getByRole("button", { name: "Download", exact: true });
    await expect(download).toHaveAttribute("data-editor-ready", "true", { timeout: 15_000 });
    await download.click();
    await page.getByRole("button", { name: "Beispieldaten übernehmen", exact: true }).click();
    await page.getByRole("button", { name: "Ja", exact: true }).click();

    const cv = page.locator("main [data-dossier-document='cv']");
    const pages = cv.locator("[data-cv-page]");
    await expect(pages.first()).toContainText("Herr Thomas Weber");

    const templateSection = page.getByRole("button", { name: /^Vorlage(?:\s|$)/ }).first();
    if ((await templateSection.getAttribute("aria-expanded")) !== "true") {
      await templateSection.click();
    }
    const templatePanelId = await templateSection.getAttribute("aria-controls");
    expect(templatePanelId).toBeTruthy();
    const templatePanel = page.locator(`[id="${templatePanelId}"]`);
    const templateButtons = templatePanel.locator("button[title][aria-pressed]");
    await expect(templateButtons).toHaveCount(38);
    const templateNames = await templateButtons.allTextContents();

    for (const rawName of templateNames) {
      const name = rawName.trim();
      await templatePanel.getByRole("button", { name, exact: true }).click();
      await expect
        .poll(() => cv.getAttribute("data-cv-template"), {
          message: `${name}: template selection must reach the rendered CV`,
        })
        .not.toBeNull();
      const templateId = await cv.getAttribute("data-cv-template");

      await expect
        .poll(() => pages.count(), {
          message: `${templateId}: normal demo CV must not create an almost-empty reference page`,
        })
        .toBe(1);

      await expect(pages.first()).toContainText("Referenzen");
      await expect(pages.first()).toContainText("Herr Thomas Weber");

      const clipped = await pages
        .first()
        .locator("[data-cv-main]")
        .evaluate((node) => ({
          scrollHeight: node.scrollHeight,
          clientHeight: node.clientHeight,
        }));
      expect(
        clipped.scrollHeight,
        `${templateId}: compacting the CV must not trade the extra page for clipped content`,
      ).toBeLessThanOrEqual(clipped.clientHeight + 3);
    }
  });
});
