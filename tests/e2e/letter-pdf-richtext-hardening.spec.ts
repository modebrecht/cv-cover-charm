import { expect, test, type Page } from "@playwright/test";
import {
  contributingPdfBaselines,
  downloadCombinedDossierPdf,
  extractPdfPageItems,
  normalizePdfText,
  pdfPageStrokeCount,
  richtextLetterPayload,
  seedRichtextDossier,
} from "./support/pdf-richtext-dossier";

const REAL_TARGETS = ["Bauernhofspielgruppe", "Allgemeinbildung", "kennenzulernen"] as const;

const SANDRO_PARAGRAPHS = [
  "Vielen Dank für das Telefongespräch vom 13. November. Wie besprochen, erhalten Sie hiermit meine aktuellen Bewerbungsunterlagen.",
  "Ich bin eine hilfsbereite und liebevolle Person, die gerne im Team arbeitet und die gestellten Aufgaben zuverlässig und sorgfältig erledigt.",
  "Seit August 2019 besuche ich das kombinierte Zwischenjahr Startpunkt Wallierhof. Während eines Jahres arbeite ich zu 60 % auf dem Praktikumsbetrieb der Familie Schenker in Däniken SO. Dort helfe ich hauptsächlich im Haushalt, in der Kinderbetreuung, bei der Kleintierbetreuung sowie in der Bauernhofspielgruppe mit. Die restlichen 40 % der Zeit gehe ich zur Schule, wo wir in Persönlichkeits- und Allgemeinbildung unterrichtet werden und zudem Berufsschulvorbereitungen machen.",
  "Dieses Jahr ermöglicht es mir, viele neue Erfahrungen zu sammeln, die mich persönlich weiterbringen und mich gut auf den Berufsalltag vorbereiten.",
  "Gerne erzähle ich Ihnen mehr über mich und freue mich darauf, Sie und Ihr Team persönlich kennenzulernen.",
  "Besten Dank bereits im Voraus für Ihre Rückmeldung.",
] as const;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sandroRichHtml() {
  return SANDRO_PARAGRAPHS.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

async function targetFragmentCounts(page: Page, targets: readonly string[]) {
  const roots = page.locator('[data-dossier-document="letter"] [data-letter-pdf-richtext="body"]');
  await expect.poll(() => roots.count()).toBeGreaterThan(0);
  return roots.first().evaluate(
    (element, wanted) => {
      const result: Record<string, number> = {};
      for (const target of wanted as string[]) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        result[target] = 0;
        while (node) {
          const raw = node.nodeValue ?? "";
          const start = raw.indexOf(target);
          if (start >= 0) {
            const range = document.createRange();
            range.setStart(node, start);
            range.setEnd(node, start + target.length);
            result[target] = Array.from(range.getClientRects()).filter(
              (rect) => rect.width > 0 && rect.height > 0,
            ).length;
            break;
          }
          node = walker.nextNode();
        }
      }
      return result;
    },
    [...targets],
  );
}

async function enableNaturalWrapStress(page: Page) {
  const roots = page.locator('[data-dossier-document="letter"] [data-letter-pdf-richtext="body"]');
  await expect.poll(() => roots.count()).toBeGreaterThan(0);
  await roots.evaluateAll((elements) => {
    for (const element of elements as HTMLElement[]) {
      element.style.hyphens = "auto";
      element.style.overflowWrap = "anywhere";
      element.style.wordBreak = "normal";
    }
  });
}

async function forceInlineWordFragments(page: Page, targets: readonly string[]) {
  const roots = page.locator('[data-dossier-document="letter"] [data-letter-pdf-richtext="body"]');
  await expect.poll(() => roots.count()).toBeGreaterThan(0);
  const counts = await roots.evaluateAll(
    (elements, wanted) => {
      const results: number[] = [];
      for (const element of elements as HTMLElement[]) {
        for (const target of wanted as string[]) {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          let node = walker.nextNode();
          while (node) {
            const raw = node.nodeValue ?? "";
            const start = raw.indexOf(target);
            if (start >= 0) {
              const parent = node.parentElement as HTMLElement | null;
              if (parent) {
                parent.style.display = "inline-block";
                parent.style.width = "76px";
                parent.style.maxWidth = "76px";
                parent.style.hyphens = "auto";
                parent.style.overflowWrap = "anywhere";
                parent.style.wordBreak = "normal";
              }
              const range = document.createRange();
              range.setStart(node, start);
              range.setEnd(node, start + target.length);
              results.push(
                Array.from(range.getClientRects()).filter(
                  (rect) => rect.width > 0 && rect.height > 0,
                ).length,
              );
              break;
            }
            node = walker.nextNode();
          }
        }
      }
      return results;
    },
    [...targets],
  );
  expect(Math.max(...counts)).toBeGreaterThan(1);
}

test.describe("Motivation-letter PDF rich-text hardening", () => {
  test.setTimeout(180_000);

  test("real Sandro letter exports at natural body width without union-box collisions", async ({
    page,
  }) => {
    const text = SANDRO_PARAGRAPHS.join("\n\n");
    await seedRichtextDossier(
      page,
      richtextLetterPayload({ text, richTextHtml: sandroRichHtml() }),
      true,
    );

    let browserFragments: Record<string, number> = {};
    const path = await downloadCombinedDossierPdf(page, async (activePage) => {
      await enableNaturalWrapStress(activePage);
      browserFragments = await targetFragmentCounts(activePage, REAL_TARGETS);
    });
    const items = await extractPdfPageItems(path);

    const extracted = items.map((item) => item.str).join(" ");
    for (const target of REAL_TARGETS) {
      expect(normalizePdfText(extracted)).toContain(normalizePdfText(target));
      const spans = contributingPdfBaselines(items, target);
      expect(spans.length).toBeGreaterThan(0);
      if ((browserFragments[target] ?? 0) > 1) {
        expect(
          new Set(spans.map((span) => Math.round(span.y * 10) / 10)).size,
          `${target} must follow the real browser line fragments`,
        ).toBeGreaterThan(1);
        expect(
          items.some((item) => normalizePdfText(item.str).includes(normalizePdfText(target))),
          `${target} must not be painted once from a union rectangle`,
        ).toBe(false);
      }
    }

    expect(
      Math.max(...REAL_TARGETS.map((target) => browserFragments[target] ?? 0)),
      "the real Sandro fixture should naturally exercise at least one wrapped target word",
    ).toBeGreaterThan(1);
  });

  test("soft hyphen and auto-hyphenation preserve fragment baselines and visible hyphens", async ({
    page,
  }) => {
    const softWord = "Verantwortungs\u00adbewusstsein";
    const autoWord = "Donaudampfschifffahrtsgesellschaft";
    await seedRichtextDossier(
      page,
      richtextLetterPayload({
        text: `${softWord} ${autoWord}`,
        richTextHtml: `<p><strong>${softWord}</strong> <em>${autoWord}</em></p>`,
        template: "brief",
      }),
      true,
    );

    const path = await downloadCombinedDossierPdf(page, async (activePage) => {
      await forceInlineWordFragments(activePage, [softWord, autoWord]);
    });
    const items = await extractPdfPageItems(path);

    for (const target of [softWord, autoWord]) {
      const spans = contributingPdfBaselines(items, target);
      expect(new Set(spans.map((span) => Math.round(span.y * 10) / 10)).size).toBeGreaterThan(1);
      expect(
        spans.some((span) => span.str.endsWith("-")),
        `${target} should expose a visible hyphen on a non-final PDF fragment`,
      ).toBe(true);
    }
  });

  test("underlined rich text rebuilds native PDF underline strokes", async ({ page }) => {
    const marker = "UNDERLINE-PROBE";

    await seedRichtextDossier(
      page,
      richtextLetterPayload({
        text: `Normal ${marker} Ende.`,
        richTextHtml: `<p>Normal ${marker} Ende.</p>`,
        template: "brief",
      }),
      false,
    );
    const plainPath = await downloadCombinedDossierPdf(page);
    const plainStrokes = await pdfPageStrokeCount(plainPath);

    await seedRichtextDossier(
      page,
      richtextLetterPayload({
        text: `Normal ${marker} Ende.`,
        richTextHtml: `<p>Normal <u>${marker}</u> Ende.</p>`,
        template: "brief",
      }),
      false,
    );
    const underlinedPath = await downloadCombinedDossierPdf(page);
    const underlinedItems = await extractPdfPageItems(underlinedPath);
    const underlinedStrokes = await pdfPageStrokeCount(underlinedPath);

    expect(contributingPdfBaselines(underlinedItems, marker).length).toBeGreaterThan(0);
    expect(
      underlinedStrokes,
      "underlined export must add a native vector stroke after raster text is hidden",
    ).toBeGreaterThan(plainStrokes);
  });
});
