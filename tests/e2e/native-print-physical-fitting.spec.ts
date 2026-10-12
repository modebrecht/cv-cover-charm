import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  BASE_URL,
  GALLERY_CASES,
  applyGalleryCase,
  seedCanonicalDossier,
} from "./support/dossier-gallery-shared";

const PDF_OPTIONS = {
  format: "A4" as const,
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  scale: 1,
  displayHeaderFooter: false,
};

async function textPages(bytes: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
  const pdf = await task.promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i),
      content = await page.getTextContent();
    const items = content.items.filter((item) => "str" in item);
    const viewport = page.getViewport({ scale: 1 });
    pages.push({
      items,
      text: items.map((item) => item.str).join(" "),
      width: viewport.width,
      height: viewport.height,
    });
  }
  await task.destroy();
  return pages;
}

async function physicalState(page: Page) {
  return page.locator("[data-dossier-pdf-canvas]").evaluate((root) => {
    const sheets = Array.from(
      root.querySelectorAll<HTMLElement>(
        '[data-dossier-document="cover"], [data-letter-document-pages] [data-letter-page], [data-cv-page]',
      ),
    );
    return sheets.map((sheet) => {
      const p = sheet.getBoundingClientRect();
      const selector = sheet.hasAttribute("data-cv-page")
        ? "[data-cv-name]"
        : sheet.hasAttribute("data-letter-page")
          ? '[data-letter-section="recipient"]'
          : '[data-block-id="name"]';
      const target = sheet.querySelector<HTMLElement>(selector)!;
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let text: Node | null;
      do {
        text = walker.nextNode();
      } while (text && !(text.textContent ?? "").trim());
      if (!text) throw new Error("Missing searchable marker");
      const range = document.createRange();
      range.selectNodeContents(text);
      const r = range.getBoundingClientRect(),
        font = getComputedStyle(text.parentElement!);
      let zoom = 1;
      for (
        let n: HTMLElement | null = text.parentElement;
        n && n !== sheet.parentElement;
        n = n.parentElement
      )
        zoom *= Number.parseFloat(getComputedStyle(n).zoom) || 1;
      return {
        text: (text.textContent ?? "").trim(),
        fontPt: (Number.parseFloat(font.fontSize) * zoom * (p.width / sheet.offsetWidth) * 72) / 96,
        xMm: ((r.x - p.x) / p.width) * 210,
        boxes: Array.from(
          sheet.querySelectorAll<HTMLElement>(
            "[data-block-id], [data-letter-content-box], [data-letter-section], [data-cv-main], [data-cv-header], [data-cv-section], [data-cv-photo], [data-cv-sidebar]",
          ),
        )
          .filter((n) => n.getClientRects().length > 0)
          .map((n) => {
            const b = n.getBoundingClientRect();
            return [
              ((b.x - p.x) / p.width) * 210,
              ((b.y - p.y) / p.height) * 297,
              (b.width / p.width) * 210,
              (b.height / p.height) * 297,
            ];
          }),
        filters: Array.from(
          sheet.querySelectorAll<HTMLElement>("*"),
          (n) => getComputedStyle(n).filter,
        ).filter((f) => f !== "none"),
      };
    });
  });
}

test("fixed A4 primitives preserve glyph metrics with nested clipped motifs", async ({ page }) => {
  const productCss = await readFile("src/components/dossier/dossier-native-print.css", "utf8");
  await page.setContent(`<style>${productCss}
  [data-dossier-print-page]{width:794px;height:1123px;position:relative;overflow:hidden}
  .marker{position:absolute;left:20mm;top:30mm;font:32pt Arial}
  .background{position:absolute;inset:0;overflow:hidden}.layer{opacity:.25;position:absolute;inset:0;left:190mm;width:20mm;height:20mm;filter:blur(7mm)}
  .motif{position:absolute;left:136mm;width:62mm;height:12mm;background:#8366cf}
  </style><div data-dossier-native-print-root data-native-print-active="true"><div data-dossier-print-page="cover"><span class="marker">PhysicalMarker</span></div><div data-dossier-print-page="letter" data-dossier-print-last="true"><div class="background"><div class="layer"><div class="motif"></div></div></div><span class="marker">SecondMarker</span></div></div>`);
  await page.evaluate(() => (document.body.dataset.dossierNativePrint = "true"));
  await page.emulateMedia({ media: "print" });
  const fixed = await textPages(await page.pdf(PDF_OPTIONS));
  expect(fixed).toHaveLength(2);
  for (const [i, sheet] of fixed.entries()) {
    const marker = sheet.items.find(
      (item) => item.str === (i === 0 ? "PhysicalMarker" : "SecondMarker"),
    )!;
    expect(marker, JSON.stringify(sheet.items)).toBeDefined();
    expect(
      (Math.abs(Math.hypot(marker.transform[0], marker.transform[1]) - 32 * 0.999572293) * 25.4) /
        72,
    ).toBeLessThanOrEqual(0.02);
    expect(Math.abs((marker.transform[4] * 25.4) / 72 - 20)).toBeLessThanOrEqual(0.02);
  }
  expect(await page.locator(".layer").evaluate((n) => getComputedStyle(n).filter)).toContain(
    "blur(",
  );
});

for (const id of ["glow", "violetPulse"]) {
  test(`${id}: native PDF keeps A4 geometry, glyph scale, positions and active paint`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const stored = await seedCanonicalDossier(page);
    await applyGalleryCase(page, stored, GALLERY_CASES.find((item) => item.id === id)!);
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    await expect(
      dialog.getByRole("button", { name: "PDF herunterladen", exact: true }),
    ).toBeEnabled({ timeout: 30000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.documentElement.dataset.dossierTemplate = "poisoned-shell";
      window.print = () => {};
    });
    const before = await physicalState(page);
    await dialog.getByRole("button", { name: "Drucken / als PDF speichern", exact: true }).click();
    await expect(page.locator("body")).toHaveAttribute("data-dossier-native-print", "true");
    await page.emulateMedia({ media: "print" });
    const printed = await physicalState(page),
      pdf = await textPages(await page.pdf(PDF_OPTIONS));
    expect(pdf).toHaveLength(before.length);
    expect(printed.flatMap((p) => p.filters).length).toBeGreaterThan(0);
    for (const [i, sheet] of pdf.entries()) {
      expect(Math.abs(sheet.width - (210 * 72) / 25.4)).toBeLessThan(0.5);
      expect(Math.abs(sheet.height - (297 * 72) / 25.4)).toBeLessThan(0.5);
      expect(sheet.text).not.toMatch(/Dossier herunterladen|Projekt speichern/);
      expect(printed[i].filters).toEqual(before[i].filters);
      expect(printed[i].boxes).toHaveLength(before[i].boxes.length);
      printed[i].boxes.forEach((box, j) =>
        box.forEach((v, k) =>
          expect(Math.abs(v - before[i].boxes[j][k])).toBeLessThanOrEqual(0.02),
        ),
      );
      const marker = sheet.items.find((item) => item.str === printed[i].text)!;
      expect(marker, printed[i].text).toBeDefined();
      expect(
        (Math.abs(Math.hypot(marker.transform[0], marker.transform[1]) - printed[i].fontPt) *
          25.4) /
          72,
      ).toBeLessThanOrEqual(0.02);
      expect(Math.abs((marker.transform[4] * 25.4) / 72 - printed[i].xMm)).toBeLessThanOrEqual(
        0.02,
      );
    }
    if (id === "glow") {
      // Counterfactual at the same resolved source: disabling only the generic
      // physical-sheet size contract reproduces the old print fitting defect.
      await page.evaluate(async () => {
        const { prepareDossierNativePrint } = await import(
          String("/src/lib/dossier-native-print.ts")
        );
        await prepareDossierNativePrint(document.querySelector("[data-dossier-pdf-canvas]")!);
      });
      const withoutSize = await page.addStyleTag({
        content:
          "body [data-native-print-active] [data-dossier-print-page]{contain:none!important}",
      });
      const broken = await textPages(await page.pdf(PDF_OPTIONS));
      const cvGlyph = broken[2].items.find((item) => item.str === printed[2].text)!;
      expect(Math.hypot(cvGlyph.transform[0], cvGlyph.transform[1])).toBeLessThan(
        printed[2].fontPt * 0.8,
      );
      const noFilter = await page.addStyleTag({
        content: "[data-native-print-active] [data-letter-page] *{filter:none!important}",
      });
      const filterOff = await textPages(await page.pdf(PDF_OPTIONS));
      expect(
        Math.hypot(
          ...filterOff[2].items.find((item) => item.str === printed[2].text)!.transform.slice(0, 2),
        ),
      ).toBeLessThan(printed[2].fontPt * 0.8);
      await noFilter.evaluate((node) => node.remove());
      // Bound only the overflowing primitive in this diagnostic intervention;
      // production preserves that primitive and contains every physical sheet.
      const bounded = await page.evaluate(() => {
        const sheet = document.querySelector<HTMLElement>(
          "[data-native-print-active] [data-letter-page]",
        )!;
        const p = sheet.getBoundingClientRect();
        const overflow = Array.from(
          sheet.querySelectorAll<HTMLElement>("[data-letter-motif]"),
        ).filter((n) => n.getBoundingClientRect().right > p.right + 1);
        overflow.forEach((n) => n.style.setProperty("left", "0", "important"));
        return overflow.length;
      });
      expect(bounded).toBeGreaterThan(0);
      const fitting = await textPages(await page.pdf(PDF_OPTIONS));
      const restored = fitting[2].items.find((item) => item.str === printed[2].text)!;
      expect(
        (Math.abs(Math.hypot(restored.transform[0], restored.transform[1]) - printed[2].fontPt) *
          25.4) /
          72,
      ).toBeLessThanOrEqual(0.02);
      await withoutSize.evaluate((node) => node.remove());
    }
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  });
}
