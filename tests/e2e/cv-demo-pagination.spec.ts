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
    // Count the runtime picker itself so shared templates such as Brief cannot drift from this gate.
    const templateButtons = templatePanel.locator("button[title][aria-pressed]");
    await expect(templateButtons).toHaveCount(38);
    const templateNames = await templateButtons.allTextContents();
    const spillages: string[] = [];

    for (const rawName of templateNames) {
      const name = rawName.trim();
      const button = templatePanel.getByRole("button", { name, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");

      const templateId = await expect
        .poll(
          () =>
            page.evaluate(
              () => JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null")?.design?.template,
            ),
          {
            message: `${name}: selected template must be persisted before pagination is inspected`,
          },
        )
        .not.toBeNull()
        .then(() =>
          page.evaluate(
            () =>
              JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null")?.design
                ?.template as string,
          ),
        );

      await expect(cv).toHaveAttribute("data-cv-template", templateId);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );

      const pageCount = await pages.count();
      if (pageCount !== 1) {
        spillages.push(`${templateId}:${pageCount}`);
        continue;
      }

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

    // Report all spillers together so one density fix can cover the complete runtime matrix.
    expect(spillages, "normal demo CV spill templates").toEqual([]);
  });
});
