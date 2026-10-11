import { expect, test } from "@playwright/test";
import {
  BASE_URL,
  GALLERY_CASES,
  applyGalleryCase,
  seedCanonicalDossier,
  waitEditorReady,
} from "./support/dossier-gallery-shared";

// Sample background fields and the page edges, away from text antialiasing.
const POINTS = [5, 205].flatMap((x) => [2, 10, 30, 50, 80, 150, 295].map((y) => [x, y]));

test("unblurred CV raster fields preserve browser opacity, stacking and inset stripes", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1800, height: 1600 });
  const stored = await seedCanonicalDossier(page);
  // These fields use opacity and sharp inset stripes, so direct RGB agreement
  // is meaningful. CSS-blurred motifs remain scored by the full gallery rather
  // than being mistaken for an opacity/stacking regression in this exact guard.
  for (const template of ["aurora", "ledger"]) {
    await test.step(template, async () => {
      const item = GALLERY_CASES.find((candidate) => candidate.id === template)!;
      await applyGalleryCase(page, stored, item);
      await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "networkidle" });
      await waitEditorReady(page);
      await page.evaluate(() => document.fonts.ready);
      const screenshot = await page
        .locator('[data-export-mode="false"] [data-cv-page="0"]')
        .screenshot({ animations: "disabled" });
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
      await expect(
        page.getByRole("button", { name: "PDF herunterladen", exact: true }),
      ).toBeEnabled();
      const result = await page.locator('[data-export-mode="true"] [data-cv-page="0"]').evaluate(
        async (sheet, { source, points }) => {
          const image = new Image();
          image.src = source;
          await image.decode();
          const browserCanvas = document.createElement("canvas");
          browserCanvas.width = image.width;
          browserCanvas.height = image.height;
          browserCanvas.getContext("2d")!.drawImage(image, 0, 0);
          const sample = (canvas: HTMLCanvasElement) =>
            points.map(([x, y]) => {
              const pixels = canvas
                .getContext("2d")!
                .getImageData(
                  Math.round((x / 210) * canvas.width) - 1,
                  Math.round((y / 297) * canvas.height) - 1,
                  3,
                  3,
                ).data;
              return [0, 1, 2].map(
                (channel) =>
                  Array.from({ length: 9 }, (_, i) => pixels[i * 4 + channel]).reduce(
                    (sum, value) => sum + value,
                    0,
                  ) / 9,
              );
            });
          const { default: html2canvas } = await import(
            String("/node_modules/html2canvas-pro/dist/html2canvas-pro.esm.js")
          );
          const { normalizeCssZoomForHtml2Canvas } = await import(
            String("/src/lib/html2canvas-export.ts")
          );
          const canvas = await html2canvas(sheet, {
            scale: 1,
            backgroundColor: "#ffffff",
            useCORS: true,
            width: 794,
            height: 1123,
            windowWidth: 794,
            windowHeight: 1123,
            scrollX: 0,
            scrollY: 0,
            onclone: (_doc: Document, cloned: HTMLElement) =>
              normalizeCssZoomForHtml2Canvas(cloned),
          });
          return { browser: sample(browserCanvas), raster: sample(canvas) };
        },
        { source: `data:image/png;base64,${screenshot.toString("base64")}`, points: POINTS },
      );
      for (let point = 0; point < POINTS.length; point++)
        for (let channel = 0; channel < 3; channel++)
          expect(
            Math.abs(result.browser[point][channel] - result.raster[point][channel]),
            `${template} at ${POINTS[point]} mm, RGB channel ${channel}: ${result.browser[point]} vs ${result.raster[point]}`,
          ).toBeLessThanOrEqual(4);
    });
  }
});
