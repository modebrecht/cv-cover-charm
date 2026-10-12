import { expect, test } from "@playwright/test";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  BASE_URL,
  GALLERY_CASES,
  applyGalleryCase,
  seedCanonicalDossier,
  waitEditorReady,
} from "./support/dossier-gallery-shared";

function sample(canvas: ReturnType<typeof createCanvas>, points: number[][]) {
  return points.map(([x, y]) =>
    Array.from(
      canvas
        .getContext("2d")
        .getImageData(Math.round(x * canvas.width), Math.round(y * canvas.height), 1, 1).data,
    ).slice(0, 3),
  );
}

test("native artwork preserves alpha gradients while content remains searchable", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1800, height: 1600 });
  const stored = await seedCanonicalDossier(page);
  for (const id of ["horizon", "violetPulse", "warm3", "colorful"]) {
    const item = GALLERY_CASES.find((candidate) => candidate.id === id)!;
    await applyGalleryCase(page, stored, item);
    const cover = id !== "colorful";
    const selector = cover
      ? 'main [data-dossier-document="cover"]'
      : '[data-export-mode="false"] [data-cv-page="0"]';
    await page.goto(BASE_URL + (cover ? "/titelblatt" : "/lebenslauf"), {
      waitUntil: "networkidle",
    });
    await waitEditorReady(page);
    await page.evaluate(() => document.fonts.ready);
    const points = await page
      .locator(selector)
      .first()
      .evaluate((sheet, cover) => {
        if (cover)
          return [
            [0.07, 0.07],
            [0.12, 0.18],
          ];
        const p = sheet.getBoundingClientRect(),
          h = sheet.querySelector("[data-cv-header]")!.getBoundingClientRect();
        return [
          [0.8, 0.25],
          [0.9, 0.7],
        ].map(([x, y]) => [
          (h.x - p.x + h.width * x) / p.width,
          (h.y - p.y + h.height * y) / p.height,
        ]);
      }, cover);
    const png = await page.locator(selector).first().screenshot({ animations: "disabled" });
    const image = await loadImage(png),
      web = createCanvas(image.width, image.height);
    web.getContext("2d").drawImage(image, 0, 0);
    const expected = sample(web, points);
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    await expect(
      dialog.getByRole("button", { name: "PDF herunterladen", exact: true }),
    ).toBeEnabled({ timeout: 30000 });
    await page.evaluate(() => {
      document.documentElement.dataset.dossierTemplate = "poisoned-shell";
      window.print = () => window.dispatchEvent(new Event("beforeprint"));
    });
    await dialog.getByRole("button", { name: "Drucken / als PDF speichern", exact: true }).click();
    await expect(page.locator("body")).toHaveAttribute("data-dossier-native-print", "true");
    await page.emulateMedia({ media: "print" });
    const sheet = page
      .locator(
        "[data-dossier-pdf-canvas] " +
          (cover ? '[data-dossier-document="cover"]' : '[data-cv-page="0"]'),
      )
      .first();
    expect(
      await sheet.evaluate(
        (sheet, cover) =>
          getComputedStyle(
            cover ? sheet.firstElementChild! : sheet.querySelector("[data-cv-header]")!,
            cover ? null : "::before",
          ).filter,
        cover,
      ),
    ).toBe("opacity(1)");
    if (id === "horizon" || id === "violetPulse") {
      expect(
        await sheet
          .locator('[data-fresh-cover-field="secondary"]')
          .evaluate((node) => getComputedStyle(node).filter),
      ).toContain("blur(");
    }
    const bytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
    const pdf = await task.promise;
    expect(pdf.numPages).toBe(3);
    const pdfPage = await pdf.getPage(cover ? 1 : 3),
      viewport = pdfPage.getViewport({ scale: 96 / 72 });
    // Use the benchmark's established MediaBox precision (0.5 PDF points).
    // The independent DOM/content geometry guard remains <= 0.02 mm.
    expect((viewport.width * 72) / 96).toBeCloseTo((210 * 72) / 25.4, 0);
    expect((viewport.height * 72) / 96).toBeCloseTo((297 * 72) / 25.4, 0);
    const content = await pdfPage.getTextContent(),
      text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, "");
    expect(text).toContain("LeaMüller");
    if (!cover) expect(text).toContain("Lebenslauf".toUpperCase());
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await pdfPage.render({ canvas: canvas as never, viewport }).promise;
    const actual = sample(canvas, points);
    for (let i = 0; i < points.length; i++)
      for (let channel = 0; channel < 3; channel++)
        expect(
          Math.abs(actual[i][channel] - expected[i][channel]),
          `${id}: background sample ${i}, channel ${channel}`,
        ).toBeLessThanOrEqual(4);
    await task.destroy();
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  }
});

test("opaque Cover artwork retains vector paint", async ({ page }) => {
  const stored = await seedCanonicalDossier(page);
  for (const id of ["brief", "edel", "edge", "ribbon", "edelDark"]) {
    const item = GALLERY_CASES.find((candidate) => candidate.id === id)!;
    await applyGalleryCase(page, stored, item);
    await page.goto(BASE_URL + "/titelblatt", { waitUntil: "networkidle" });
    await waitEditorReady(page);
    const background = page.locator('main [data-dossier-document="cover"] > div:first-child');
    expect(
      await background.getAttribute("data-dossier-paint-alpha-gradient"),
      item.label,
    ).toBeNull();
    expect(await background.evaluate((node) => getComputedStyle(node).filter), item.label).toBe(
      "none",
    );
  }
});
