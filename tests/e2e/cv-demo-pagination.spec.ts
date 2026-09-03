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
    const templateCount = await templateButtons.count();
    const spillages: string[] = [];
    const exercisedTemplateIds = new Set<string>();

    for (let index = 0; index < templateCount; index += 1) {
      const button = templateButtons.nth(index);
      const name = (await button.textContent())?.trim() || `template-${index + 1}`;
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");

      // Template selection, dossier-theme propagation and pagination do not commit in one
      // React frame. Wait for the document to become mutation-quiet before sampling pages;
      // otherwise this gate can attribute the previous template's pagination to the new one.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            let timer = 0;
            const observer = new MutationObserver(() => {
              window.clearTimeout(timer);
              timer = window.setTimeout(finish, 120);
            });
            const finish = () => {
              observer.disconnect();
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            };

            observer.observe(document.documentElement, {
              subtree: true,
              childList: true,
              attributes: true,
              characterData: true,
            });
            timer = window.setTimeout(finish, 120);
          }),
      );

      // React selection is the source of truth here. Autosave intentionally lags behind the UI,
      // so localStorage must not decide which template the pagination gate is inspecting.
      const templateId = await cv.getAttribute("data-cv-template");
      expect(templateId, `${name}: selected template must reach the rendered CV`).toBeTruthy();
      exercisedTemplateIds.add(templateId!);

      const pageCount = await pages.count();
      if (pageCount !== 1) {
        const continuation = (await pages.nth(1).innerText())
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 180);
        spillages.push(`${templateId}:${pageCount}:${continuation}`);
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

    expect(
      exercisedTemplateIds.size,
      "runtime template picker must exercise 38 unique CV templates",
    ).toBe(38);
    // Report all spillers together so one density fix can cover the complete runtime matrix.
    expect(spillages, "normal demo CV spill templates").toEqual([]);
  });
});
