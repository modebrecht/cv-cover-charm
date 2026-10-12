import { expect, test } from "@playwright/test";
import {
  BASE_URL,
  GALLERY_CASES,
  applyGalleryCase,
  seedCanonicalDossier,
  waitEditorReady,
} from "./support/dossier-gallery-shared";

// Geometry at the real html2canvas boundary, including legacy nested CSS zoom.
// The clone may normalize browser limitations, but must preserve the print DOM.
test("all 39 gallery CVs retain print geometry through html2canvas normalization", async ({
  page,
}) => {
  test.setTimeout(10 * 60_000);
  const stored = await seedCanonicalDossier(page);
  for (const item of GALLERY_CASES) {
    await applyGalleryCase(page, stored, item);
    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "networkidle" });
    await waitEditorReady(page);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    const visible = page.locator('[data-dossier-document="cv"][data-export-mode="false"]').first();
    // Include generated artwork: CoverBackground used to inject CV ::before /
    // ::after rules only after a Cover mounted, despite matching ordinary nodes.
    const paint = async (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((sheet) => {
          const properties = [
            "content",
            "background-color",
            "background-image",
            "filter",
            "opacity",
            "display",
          ];
          return [sheet, ...sheet.querySelectorAll("*")].map((node) =>
            [null, "::before", "::after"].map((pseudo) => {
              const style = getComputedStyle(node, pseudo);
              return properties.map((property) => style.getPropertyValue(property));
            }),
          );
        });
    const previewPaint = await paint('[data-export-mode="false"] [data-cv-page="0"]');
    const selector =
      "[data-cv-main], [data-cv-header], [data-cv-section], [data-cv-entry-title], [data-cv-photo], [data-cv-sidebar], [data-cv-doc-title]";
    const preview = await visible.locator('[data-cv-page="0"]').evaluate((sheet, selector) => {
      const p = sheet.getBoundingClientRect();
      return Array.from(sheet.querySelectorAll<HTMLElement>(selector)).map((node) => {
        const r = node.getBoundingClientRect();
        const s = getComputedStyle(node);
        return {
          text: node.textContent,
          box: [
            ((r.x - p.x) / p.width) * 210,
            ((r.y - p.y) / p.height) * 297,
            (r.width / p.width) * 210,
            (r.height / p.height) * 297,
          ],
          font: [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing],
        };
      });
    }, selector);
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    await expect(
      dialog.getByRole("button", { name: "PDF herunterladen", exact: true }),
    ).toBeEnabled({ timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    expect(
      await paint('[data-export-mode="true"] [data-cv-page="0"]'),
      `${item.label}: local paint, including pseudo-elements`,
    ).toEqual(previewPaint);
    const result = await page
      .locator('[data-dossier-document="cv"][data-export-mode="true"] [data-cv-page="0"]')
      .first()
      .evaluate(async (sheet, selector) => {
        const read = (sheet: HTMLElement) => {
          const p = sheet.getBoundingClientRect();
          const view = sheet.ownerDocument.defaultView!;
          return Array.from(sheet.querySelectorAll<HTMLElement>(selector)).map((node) => {
            const r = node.getBoundingClientRect();
            const s = view.getComputedStyle(node);
            return {
              text: node.textContent,
              box: [
                ((r.x - p.x) / p.width) * 210,
                ((r.y - p.y) / p.height) * 297,
                (r.width / p.width) * 210,
                (r.height / p.height) * 297,
              ],
              font: [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing],
            };
          });
        };
        const print = read(sheet);
        const { default: html2canvas } = await import(
          String("/node_modules/html2canvas-pro/dist/html2canvas-pro.esm.js")
        );
        const { normalizeCssZoomForHtml2Canvas } = await import(
          String("/src/lib/html2canvas-export.ts")
        );
        let clone = print;
        await html2canvas(sheet, {
          scale: 1,
          backgroundColor: "#ffffff",
          useCORS: true,
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
          scrollX: 0,
          scrollY: 0,
          onclone: (_doc: Document, cloned: HTMLElement) => {
            normalizeCssZoomForHtml2Canvas(cloned);
            clone = read(cloned);
          },
        });
        return { print, clone };
      }, selector);
    expect(result.print.length, item.label).toBe(preview.length);
    expect(result.clone.length, item.label).toBe(preview.length);
    for (let i = 0; i < preview.length; i++) {
      for (const [name, actual, tolerance] of [
        ["print", result.print[i], 0.02],
        ["normalized clone", result.clone[i], 0.3],
      ] as const) {
        expect(actual.text, `${item.label}: ${name} content`).toBe(preview[i].text);
        expect(actual.font, `${item.label}: ${name} font metrics`).toEqual(preview[i].font);
        for (let axis = 0; axis < 4; axis++)
          expect(
            Math.abs(actual.box[axis] - preview[i].box[axis]),
            `${item.label}: ${name} node ${i} axis ${axis}`,
          ).toBeLessThanOrEqual(tolerance);
      }
    }
  }
});
