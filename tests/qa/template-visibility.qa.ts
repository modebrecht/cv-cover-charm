import { expect, test } from "@playwright/test";
import { documentRoots, loadFixture } from "./pagination-browser";
import { paginationFixture } from "./pagination-fixtures";

test("visibility studio3: flow name and title contrast with the paper", async ({ page }) => {
  await loadFixture(page, paginationFixture("studio3"), "cv");
  const roots = documentRoots("cv");
  for (const root of [roots.web, roots.canonical]) {
    const headings = await page
      .locator(`${root} ${roots.pages} [data-cv-header] :is([data-cv-name], [data-cv-doc-title])`)
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const color = getComputedStyle(node).color;
          const channels = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number);
          const [r, g, b] = channels.map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
          return {
            text: node.textContent,
            color,
            contrast: 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05),
          };
        }),
      );
    expect(headings.length).toBeGreaterThanOrEqual(2);
    for (const heading of headings)
      expect(heading.contrast, JSON.stringify(heading)).toBeGreaterThanOrEqual(4.5);
  }
});

for (const continuationTop of [undefined, 18]) {
  test(`visibility sonne: header stays above text, continuation ${continuationTop ?? "default"}`, async ({
    page,
  }) => {
    const fixture = paginationFixture("sonne", { paragraphs: 8 });
    if (continuationTop !== undefined) {
      const letter = JSON.parse(fixture.storage["anschreiben:v1"]);
      letter.design.continuationTopMarginMm = continuationTop;
      fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
    }
    await loadFixture(page, fixture, "letter");
    const roots = documentRoots("letter");
    for (const root of [roots.web, roots.canonical]) {
      const bounds = await page.locator(`${root} ${roots.pages}`).evaluateAll((sheets) =>
        sheets.map((sheet) => {
          const band = sheet.querySelector(
            '[data-dossier-sheet-background="sonne"] > .absolute.inset-x-0.top-0',
          )!;
          const text = sheet.querySelector("[data-letter-text-layer]")!;
          return {
            page: sheet.getAttribute("data-letter-page-index"),
            overlapMm:
              ((band.getBoundingClientRect().bottom - text.getBoundingClientRect().top) * 297) /
              sheet.getBoundingClientRect().height,
          };
        }),
      );
      expect(bounds.length).toBeGreaterThanOrEqual(2);
      for (const bound of bounds)
        expect(bound.overlapMm, JSON.stringify(bound)).toBeLessThanOrEqual(0.3);
    }
  });
}
