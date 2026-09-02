import { expect, test } from "@playwright/test";
import "../../src/components/cover/fresh-templates";
import { TEMPLATES } from "../../src/components/cover/types";
import { DEMO_CV } from "../../src/components/cv/types";

const BASE_URL = "http://127.0.0.1:4173";
const STORAGE_KEY = "lebenslauf:v1";

function savedDemo(template: (typeof TEMPLATES)[number]) {
  return {
    version: 6,
    data: DEMO_CV,
    design: {
      template: template.id,
      colors: Object.fromEntries(template.slots.map((slot) => [slot.key, slot.default])),
      font: "freundlich",
      bgOpacity: 0.25,
      useElements: false,
    },
    elements: [],
    elementStyles: {},
    coverFingerprint: null,
  };
}

test.describe("M9 demo CV pagination", () => {
  test.setTimeout(6 * 60_000);

  test("every selectable template keeps the normal demo CV compact without an almost-empty continuation", async ({
    page,
  }) => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(37);

    for (const template of TEMPLATES) {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ key, saved }) => {
          localStorage.clear();
          localStorage.setItem(key, JSON.stringify(saved));
        },
        { key: STORAGE_KEY, saved: savedDemo(template) },
      );
      await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });

      const download = page.getByRole("button", { name: "Download", exact: true });
      await expect(download).toHaveAttribute("data-editor-ready", "true", { timeout: 15_000 });

      const cv = page.locator("main [data-dossier-document='cv']");
      const pages = cv.locator("[data-cv-page]");
      await expect(cv).toHaveAttribute("data-cv-template", template.id);
      await expect
        .poll(() => pages.count(), {
          message: `${template.id}: normal demo CV must not create an almost-empty reference page`,
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
        `${template.id}: compacting the CV must not trade the extra page for clipped content`,
      ).toBeLessThanOrEqual(clipped.clientHeight + 3);
    }
  });
});
