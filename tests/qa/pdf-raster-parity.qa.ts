import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { paginationFixture, type FixtureOptions } from "./pagination-fixtures";
import { auditDocument, evidenceDir, loadFixture } from "./pagination-browser";

for (const [template, label, options] of [
  ["brief", "boundary", { works: 11, schools: 1 }],
  ["brief", "blank-lines", { works: 2, schools: 1 }],
  ["studio", "one", { works: 1, schools: 1 }],
  ["monoLuxe", "font-inheritance", { works: 3, schools: 2 }],
  ["gallery", "timeline", { works: 12, schools: 6, layout: "timeline" }],
] as [string, string, FixtureOptions][]) {
  test(`raster clone retains measured plain CV lines: ${template} ${label}`, async ({ page }) => {
    const fixture = paginationFixture(template, options);
    if (label === "blank-lines") {
      const stored = JSON.parse(fixture.storage["lebenslauf:v1"]);
      stored.data.erfahrung[0].beschreibung = stored.data.erfahrung[0].beschreibung.replace(
        "Ich prüfte",
        "\n\nIch prüfte",
      );
      fixture.storage["lebenslauf:v1"] = JSON.stringify(stored);
    }
    if (label === "font-inheritance") {
      const saved = JSON.parse(fixture.storage["lebenslauf:v1"]);
      saved.data.person.vorname = "QANAME001 Lea";
      saved.data.person.nameStyle = { font: "serif" };
      fixture.storage["lebenslauf:v1"] = JSON.stringify(saved);
      fixture.markers.cv.push("QANAME001");
    }
    await loadFixture(page, fixture, "cv");
    const clones = await page
      .locator('[data-dossier-document="cv"][data-export-mode="true"]')
      .evaluate(async (root) => {
        const modulePath = "/src/lib/html2canvas-export.ts";
        const { normalizeCssZoomForHtml2Canvas } = await import(modulePath);
        const canvasPath = "/node_modules/.vite/deps/html2canvas-pro.js";
        const { default: html2canvas } = await import(canvasPath);
        const measure = (sheet: HTMLElement) => {
          const result: { marker: string; box: number[]; font: string; family: string }[] = [];
          const p = sheet.getBoundingClientRect();
          const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          while ((node = walker.nextNode())) {
            for (const match of (node.textContent ?? "").matchAll(/QA[A-Z]+\d{3}/g)) {
              const range = document.createRange();
              range.setStart(node, match.index!);
              range.setEnd(node, match.index! + match[0].length);
              for (const r of Array.from(range.getClientRects())) {
                if (!r.width || !r.height) continue;
                result.push({
                  marker: match[0],
                  box: [
                    ((r.left - p.left) * 210) / p.width,
                    ((r.top - p.top) * 297) / p.height,
                    (r.width * 210) / p.width,
                    (r.height * 297) / p.height,
                  ],
                  font: getComputedStyle(node.parentElement!).fontSize,
                  family: getComputedStyle(node.parentElement!).fontFamily,
                });
              }
            }
          }
          return result;
        };
        const result: { before: ReturnType<typeof measure>; after: ReturnType<typeof measure> }[] =
          [];
        for (const sheet of root.querySelectorAll<HTMLElement>("[data-cv-page]")) {
          await html2canvas(sheet, {
            scale: 1,
            onclone: (_document: Document, clone: HTMLElement) => {
              const before = measure(clone);
              normalizeCssZoomForHtml2Canvas(clone);
              result.push({ before, after: measure(clone) });
            },
          });
        }
        return result;
      });
    await mkdir(evidenceDir, { recursive: true });
    await writeFile(
      `${evidenceDir}/variant-raster-${template}-${label}-clone.json`,
      JSON.stringify(clones, null, 2),
    );
    for (const clone of clones) {
      expect(clone.after.map((m) => m.marker)).toEqual(clone.before.map((m) => m.marker));
      for (const [index, before] of clone.before.entries()) {
        const after = clone.after[index];
        expect(after.font, before.marker).toBe(before.font);
        expect(after.family, before.marker).toBe(before.family);
        for (let coordinate = 0; coordinate < 4; coordinate++)
          expect(
            Math.abs(after.box[coordinate] - before.box[coordinate]),
            before.marker,
          ).toBeLessThanOrEqual(0.3);
      }
    }
    const audit = await auditDocument(
      page,
      fixture,
      "cv",
      `variant-raster-${template}-${label}-cv`,
    );
    expect(audit.findings).toEqual([]);
  });
}

test("dark authored Letter paper uses its own automatic ink in the real PDF", async ({ page }) => {
  const fixture = paginationFixture("edelDark", { works: 1, schools: 1, paragraphs: 2 });
  await loadFixture(page, fixture, "letter");
  const colors = await page
    .locator("[data-letter-standalone-export] [data-letter-page]")
    .first()
    .evaluate((sheet) => ({
      paper: (sheet as HTMLElement).dataset.letterPaperColor,
      ink: (sheet as HTMLElement).dataset.letterTextColor,
      body: getComputedStyle(sheet.querySelector('[data-letter-pdf-richtext="body"]')!).color,
    }));
  expect(colors).toEqual({ paper: "#171716", ink: "#ffffff", body: "rgb(255, 255, 255)" });
  const audit = await auditDocument(page, fixture, "letter", "variant-raster-dark-letter");
  expect(audit.findings).toEqual([]);
});
