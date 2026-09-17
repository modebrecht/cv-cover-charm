import { expect, test, type Page } from "@playwright/test";
import {
  contributingPdfBaselines,
  downloadCombinedDossierPdf,
  extractPdfPageItems,
  normalizePdfText,
  richtextLetterPayload,
  seedRichtextDossier,
} from "./support/pdf-richtext-dossier";

const TARGET_WORDS = ["Bauernhofspielgruppe", "Allgemeinbildung", "kennenzulernen"] as const;
const RICH_TEXT_HTML =
  "<p>ich <strong>Bauernhofspielgruppe</strong> mit <em>Allgemeinbildung</em>.</p><p>Gerne kennenzulernen.</p>";

async function forceDeterministicWrappedWords(page: Page) {
  const roots = page.locator("[data-letter-pdf-richtext]");
  await expect.poll(() => roots.count()).toBeGreaterThan(0);
  const fragmentCounts = await roots.evaluateAll(
    (elements, targetWords) => {
      const counts: number[] = [];
      for (const element of elements as HTMLElement[]) {
        element.style.width = "56px";
        element.style.maxWidth = "56px";
        element.style.overflowWrap = "anywhere";
        element.style.wordBreak = "normal";
        element.style.hyphens = "none";

        for (const target of targetWords as string[]) {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          let node = walker.nextNode();
          let count = 0;
          while (node) {
            const raw = node.nodeValue ?? "";
            const start = raw.indexOf(target);
            if (start >= 0) {
              const range = document.createRange();
              range.setStart(node, start);
              range.setEnd(node, start + target.length);
              count = Array.from(range.getClientRects()).filter(
                (rect) => rect.width > 0 && rect.height > 0,
              ).length;
              break;
            }
            node = walker.nextNode();
          }
          counts.push(count);
        }
      }
      return counts;
    },
    [...TARGET_WORDS],
  );

  expect(
    Math.max(...fragmentCounts),
    "fixture must force at least one rich-text word across visual line fragments",
  ).toBeGreaterThan(1);
}

test.describe("Motivation-letter PDF rich-text wrap regression", () => {
  test.setTimeout(180_000);

  test("combined dossier paints wrapped rich-text words per visual fragment", async ({ page }) => {
    await seedRichtextDossier(
      page,
      richtextLetterPayload({
        text: "ich Bauernhofspielgruppe mit Allgemeinbildung. Gerne kennenzulernen.",
        richTextHtml: RICH_TEXT_HTML,
      }),
      false,
    );

    const path = await downloadCombinedDossierPdf(page, forceDeterministicWrappedWords);
    const items = await extractPdfPageItems(path);

    for (const target of TARGET_WORDS) {
      const spans = contributingPdfBaselines(items, target);
      expect(
        items.some((item) => normalizePdfText(item.str).includes(target)),
        `${target} must not be painted once from a union bounding box`,
      ).toBe(false);
      expect(
        new Set(spans.map((span) => Math.round(span.y * 10) / 10)).size,
        `${target} must follow the browser's multiple visual line fragments`,
      ).toBeGreaterThan(1);
    }
  });
});
