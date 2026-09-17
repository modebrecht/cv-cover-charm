import { expect, test, type Page } from "@playwright/test";
import { readFile, stat } from "node:fs/promises";

const BASE_URL = "http://127.0.0.1:4173";
const LETTER_STORAGE_KEY = "anschreiben:v1";
const HYPHENATION_STORAGE_KEY = "bewerbungsdossier:hyphenation:v1";
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

function letterPayload({
  text,
  richTextHtml,
  template = "modern",
}: {
  text: string;
  richTextHtml: string;
  template?: string;
}) {
  return {
    version: 1,
    data: {
      absenderName: "Sandro Müller",
      absenderAdresse: "Wylweg 15",
      absenderPlzOrt: "4533 Riedholz",
      absenderTelefon: "0798150037",
      absenderEmail: "saendu.mueller@gmail.com",
      empfaengerFirma: "Schmid Holzbau",
      empfaengerName: "Herr Peter Schmid",
      empfaengerAdresse: "Industriestrasse 3",
      empfaengerPlzOrt: "4524 Günsberg",
      ort: "Hubersdorf",
      datum: "15.09.2026",
      betreff: "Bewerbung um eine Lehrstelle als Zimmermann EFZ Sommer 2027",
      anrede: "Sehr geehrter Herr Schmid",
      text,
      richTextHtml,
      gruss: "Freundliche Grüsse",
      unterschrift: "Sandro Müller",
      images: [],
      showBeilagen: true,
      beilagen: ["Lebenslauf", "Zeugnis"],
    },
    design: {
      template,
      colors: {
        bg: "#ffffff",
        ink: "#172033",
        primary: "#24364b",
        secondary: "#dbeafe",
        accent: "#2563eb",
        cvInk: "#172033",
        cvMuted: "#526072",
        cvHeading: "#172033",
      },
      font: "freundlich",
      fontOverride: null,
      senderAlign: "left",
      recipientAlign: "left",
      dateAlign: "left",
      ruleAfterSender: false,
      ruleAfterRecipient: false,
      ruleAfterSubject: false,
      headerMode: "compact",
      headerShowName: true,
      headerShowAddress: true,
      headerShowPhone: true,
      headerShowEmail: true,
      footerMode: "compact",
    },
  };
}

async function seedLetter(
  page: Page,
  payload: ReturnType<typeof letterPayload>,
  hyphenation = true,
) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ letter, hyphenationKey, hyphenationEnabled }) => {
      localStorage.clear();
      localStorage.setItem("anschreiben:v1", JSON.stringify(letter));
      localStorage.setItem(
        hyphenationKey,
        JSON.stringify({ version: 1, enabled: hyphenationEnabled }),
      );
      document.documentElement.lang = "de";
    },
    {
      letter: payload,
      hyphenationKey: HYPHENATION_STORAGE_KEY,
      hyphenationEnabled: hyphenation,
    },
  );
  await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    document.documentElement.lang = "de";
  });
  const download = page.getByRole("button", { name: "Download", exact: true });
  await expect(download).toHaveAttribute("data-editor-ready", "true", { timeout: 15_000 });
  await expect(page.locator('[data-letter-pdf-richtext="body"]').first()).toBeVisible();
}

async function downloadStandalonePdf(page: Page) {
  const download = page.getByRole("button", { name: "Download", exact: true });
  await download.click();
  const pdfButton = page.getByRole("button", { name: /Nur Motivationsschreiben als PDF/i });
  await expect(pdfButton).toBeVisible();
  const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });
  await pdfButton.click();
  const file = await downloadPromise;
  const path = await file.path();
  expect(path).not.toBeNull();
  expect((await stat(path ?? "")).size).toBeGreaterThan(8_000);
  return path ?? "";
}

type PdfTextItem = { str: string; x: number; y: number; width: number };

async function extractPdfItems(path: string): Promise<PdfTextItem[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await readFile(path));
  const document = await getDocument({ data, disableFontFace: true }).promise;
  const pdfPage = await document.getPage(1);
  const content = await pdfPage.getTextContent();
  return content.items.flatMap((item) =>
    "str" in item
      ? [
          {
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: "width" in item ? item.width : 0,
          },
        ]
      : [],
  );
}

function normalized(value: string) {
  return value.replace(/[\s\u00ad-]+/g, "");
}

function contributingBaselines(items: PdfTextItem[], target: string) {
  let stream = "";
  const spans: Array<{ start: number; end: number; y: number; str: string }> = [];
  for (const item of items) {
    const clean = normalized(item.str);
    if (!clean) continue;
    const start = stream.length;
    stream += clean;
    spans.push({ start, end: stream.length, y: item.y, str: item.str });
  }
  const targetStart = stream.indexOf(normalized(target));
  expect(targetStart, `${target} must remain extractable`).toBeGreaterThanOrEqual(0);
  const targetEnd = targetStart + normalized(target).length;
  return spans.filter((span) => span.end > targetStart && span.start < targetEnd);
}

async function naturalFragmentCounts(page: Page, targets: readonly string[]) {
  return page.locator('[data-letter-pdf-richtext="body"]').first().evaluate(
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

async function pdfStrokeCount(path: string) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await readFile(path));
  const document = await pdfjs.getDocument({ data, disableFontFace: true }).promise;
  const pdfPage = await document.getPage(1);
  const operators = await pdfPage.getOperatorList();
  const strokeOp = (pdfjs as unknown as { OPS?: { stroke?: number } }).OPS?.stroke;
  if (strokeOp === undefined) return operators.fnArray.length;
  return operators.fnArray.filter((operation) => operation === strokeOp).length;
}

test.describe("Motivation-letter PDF rich-text hardening", () => {
  test.setTimeout(180_000);

  test("real Sandro letter exports at natural width without union-box collisions", async ({ page }) => {
    const text = SANDRO_PARAGRAPHS.join("\n\n");
    await seedLetter(page, letterPayload({ text, richTextHtml: sandroRichHtml() }), true);

    const fragmentCounts = await naturalFragmentCounts(page, REAL_TARGETS);
    const path = await downloadStandalonePdf(page);
    const items = await extractPdfItems(path);

    for (const target of REAL_TARGETS) {
      const spans = contributingBaselines(items, target);
      expect(spans.length, `${target} must be represented in native PDF text`).toBeGreaterThan(0);
      if ((fragmentCounts[target] ?? 0) > 1) {
        expect(
          new Set(spans.map((span) => Math.round(span.y * 10) / 10)).size,
          `${target} must follow its natural browser line fragments`,
        ).toBeGreaterThan(1);
        expect(
          spans.some((span) => normalized(span.str).includes(normalized(target))),
          `${target} must not be painted once from a union rectangle`,
        ).toBe(false);
      }
    }

    const extracted = items.map((item) => item.str).join(" ");
    expect(extracted).toContain("Bauernhofspielgruppe");
    expect(extracted).toContain("Allgemeinbildung");
    expect(extracted).toContain("kennenzulernen");
  });

  test("soft hyphen and auto-hyphenation keep fragment baselines and visible hyphens", async ({
    page,
  }) => {
    const softWord = "Verantwortungs\u00adbewusstsein";
    const autoWord = "Donaudampfschifffahrtsgesellschaft";
    const richTextHtml = `<p>${softWord} ${autoWord}</p>`;
    await seedLetter(
      page,
      letterPayload({ text: `${softWord} ${autoWord}`, richTextHtml, template: "brief" }),
      true,
    );

    const body = page.locator('[data-letter-pdf-richtext="body"]').first();
    const fragmentCounts = await body.evaluate(
      (element, words) => {
        const html = element as HTMLElement;
        html.style.width = "70px";
        html.style.maxWidth = "70px";
        html.style.wordBreak = "normal";
        html.style.overflowWrap = "anywhere";
        html.style.hyphens = "auto";
        const counts: Record<string, number> = {};
        for (const target of words as string[]) {
          const walker = document.createTreeWalker(html, NodeFilter.SHOW_TEXT);
          let node = walker.nextNode();
          counts[target] = 0;
          while (node) {
            const raw = node.nodeValue ?? "";
            const start = raw.indexOf(target);
            if (start >= 0) {
              const range = document.createRange();
              range.setStart(node, start);
              range.setEnd(node, start + target.length);
              counts[target] = Array.from(range.getClientRects()).filter(
                (rect) => rect.width > 0 && rect.height > 0,
              ).length;
              break;
            }
            node = walker.nextNode();
          }
        }
        return counts;
      },
      [softWord, autoWord],
    );

    expect(fragmentCounts[softWord]).toBeGreaterThan(1);
    expect(fragmentCounts[autoWord]).toBeGreaterThan(1);

    const path = await downloadStandalonePdf(page);
    const items = await extractPdfItems(path);
    for (const target of [softWord, autoWord]) {
      const spans = contributingBaselines(items, target);
      expect(new Set(spans.map((span) => Math.round(span.y * 10) / 10)).size).toBeGreaterThan(1);
      expect(
        spans.some((span) => span.str.endsWith("-")),
        `${target} should expose a visible hyphen on a non-final PDF fragment`,
      ).toBe(true);
    }
  });

  test("underlined rich text rebuilds a native PDF underline instead of losing decoration", async ({
    page,
  }) => {
    const marker = "UNDERLINE-PROBE";
    const plainPayload = letterPayload({
      text: `Normal ${marker} Ende.`,
      richTextHtml: `<p>Normal ${marker} Ende.</p>`,
      template: "brief",
    });
    await seedLetter(page, plainPayload, false);
    const plainPath = await downloadStandalonePdf(page);
    const plainStrokes = await pdfStrokeCount(plainPath);

    const underlinedPayload = letterPayload({
      text: `Normal ${marker} Ende.`,
      richTextHtml: `<p>Normal <u>${marker}</u> Ende.</p>`,
      template: "brief",
    });
    await seedLetter(page, underlinedPayload, false);
    const underlinedPath = await downloadStandalonePdf(page);
    const underlinedItems = await extractPdfItems(underlinedPath);
    const underlinedStrokes = await pdfStrokeCount(underlinedPath);

    expect(contributingBaselines(underlinedItems, marker).length).toBeGreaterThan(0);
    expect(
      underlinedStrokes,
      "underlined export must add a native vector stroke after raster text is hidden",
    ).toBeGreaterThan(plainStrokes);
  });
});
