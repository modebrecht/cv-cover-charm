import { expect, test, type Locator } from "@playwright/test";
import {
  BASE_URL,
  GALLERY_CASES,
  applyGalleryCase,
  seedCanonicalDossier,
  waitEditorReady,
} from "./support/dossier-gallery-shared";

async function metrics(cv: Locator) {
  return cv.evaluate((root) => {
    const properties = [
      "fontFamily",
      "fontSize",
      "fontWeight",
      "lineHeight",
      "letterSpacing",
      "color",
      "display",
      "left",
      "right",
      "top",
      "bottom",
      "width",
      "height",
      "paddingLeft",
      "paddingRight",
      "marginTop",
      "marginBottom",
      "borderRadius",
      "backgroundColor",
    ] as const;
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        "[data-cv-page], [data-cv-measure-page], [data-cv-main], [data-cv-header], [data-cv-sidebar], [data-cv-name], [data-cv-section], [data-cv-section-title], [data-cv-entry-title], [data-cv-body], [data-cv-photo]",
      ),
      (node) => {
        const style = getComputedStyle(node);
        return Object.fromEntries(properties.map((property) => [property, style[property]]));
      },
    );
  });
}

test("CV template geometry and typography ignore mismatched and absent html identity", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1800, height: 1600 });
  const stored = await seedCanonicalDossier(page);
  for (const template of [
    "studio2",
    "studio3",
    "ledger",
    "ribbon",
    "gallery",
    "prism",
    "orbit",
    "cove",
    "freundlich",
    "warm2",
    "warm3",
    "citrus",
  ]) {
    const item = GALLERY_CASES.find((candidate) => candidate.id === template);
    if (!item) throw new Error(`Missing active template ${template}`);
    await applyGalleryCase(page, stored, item);
    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });
    await waitEditorReady(page);
    await page.evaluate(() => document.fonts.ready);
    const cv = page.locator('[data-dossier-document="cv"][data-export-mode="false"]').first();
    await expect(cv).toHaveAttribute("data-cv-template", template);
    await expect(cv.locator("[data-cv-page]")).toHaveCount(1);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await page.waitForTimeout(250);
    const before = await metrics(cv);
    for (const identity of ["brief", null]) {
      await page.evaluate((value) => {
        if (value) document.documentElement.dataset.dossierTemplate = value;
        else delete document.documentElement.dataset.dossierTemplate;
        for (const property of Array.from(document.documentElement.style)) {
          if (property.startsWith("--dossier-"))
            document.documentElement.style.removeProperty(property);
        }
      }, identity);
      expect(await metrics(cv), `${template} with html template ${identity}`).toEqual(before);
    }
    // The first hidden page and visible page share the same main content box.
    const boxes = await cv.evaluate((root) => {
      const read = (selector: string) => {
        const node = root.querySelector<HTMLElement>(selector)!;
        const style = getComputedStyle(node);
        return [style.left, style.right, style.top, style.bottom, style.width];
      };
      return [
        read("[data-cv-measure-page] > [data-cv-main]"),
        read('[data-cv-page="0"] > [data-cv-main]'),
      ];
    });
    expect(boxes[0], `${template} measurement box`).toEqual(boxes[1]);
  }
});
