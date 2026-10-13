import { expect, test } from "@playwright/test";
import {
  BASE_URL,
  GALLERY_CASES,
  applyGalleryCase,
  seedCanonicalDossier,
} from "./support/dossier-gallery-shared";
const compact = (text: string) => text.replace(/\s+/g, "").toLocaleLowerCase("de");
async function pdfText(bytes: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
  const pdf = await task.promise;
  const text: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    text.push(
      content.items
        .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : ""))
        .join(""),
    );
  }
  await task.destroy();
  return text;
}
test("all 39 native CVs retain semantic title and name order with isolated content rows", async ({
  page,
}) => {
  test.setTimeout(900000);
  const stored = await seedCanonicalDossier(page);
  const literalHeadingSearch: { template: string; literalFamilie: boolean }[] = [];
  for (const item of GALLERY_CASES) {
    await applyGalleryCase(page, stored, item);
    await page.goto(`${BASE_URL}/?native-print-qa=1`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    await expect(
      dialog.getByRole("button", { name: "PDF herunterladen", exact: true }),
    ).toBeEnabled({ timeout: 30000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.documentElement.dataset.dossierTemplate = "poisoned-shell";
      window.print = () => window.dispatchEvent(new Event("beforeprint"));
    });
    const rowSelector = "[data-dossier-pdf-canvas] [data-cv-page] [data-cv-content-row]";
    expect(await page.locator(rowSelector).count(), item.label).toBeGreaterThan(0);
    expect(
      await page
        .locator(rowSelector)
        .evaluateAll((nodes) =>
          nodes.every((node) => getComputedStyle(node).isolation === "isolate"),
        ),
      item.label,
    ).toBe(true);
    await dialog.getByRole("button", { name: "Drucken / als PDF speichern", exact: true }).click();
    await expect(page.locator("body")).toHaveAttribute("data-dossier-native-print", "true");
    await page.emulateMedia({ media: "print" });
    const bytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    const pages = await pdfText(bytes),
      cv = compact(pages.slice(2).join(" "));
    literalHeadingSearch.push({
      template: item.label,
      literalFamilie: /\bfamilie\b/iu.test(pages.slice(2).join("\n")),
    });
    const entry = cv.indexOf("sekundarschule,niveaua");
    const title = cv.indexOf("lebenslauf"),
      name = cv.indexOf("leamüller");
    expect(entry, item.label).toBeGreaterThanOrEqual(0);
    expect(title, item.label).toBeGreaterThanOrEqual(0);
    expect(name, item.label).toBeGreaterThanOrEqual(0);
    expect(title, item.label).toBeLessThan(entry);
    expect(name, item.label).toBeLessThan(entry);
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    console.log("NATIVE TEXT ORDER " + item.label + " passed");
  }
  await test.info().attach("native-literal-heading-observations", {
    body: JSON.stringify(literalHeadingSearch),
    contentType: "application/json",
  });
});
