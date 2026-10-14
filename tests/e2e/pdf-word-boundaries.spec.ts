import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  BASE_URL,
  GALLERY_CASES,
  applyGalleryCase,
  seedCanonicalDossier,
} from "./support/dossier-gallery-shared";
import { parityStorage } from "./support/cv-parity-fixture";

async function viewerText(bytes: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
  const pdf = await task.promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    // Match PDF.js FindController extraction. Adding a space between every
    // item would hide the regression when glyph runs incorrectly join words.
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : ""))
        .join(""),
    );
  }
  await task.destroy();
  return pages;
}

async function automaticPdf(page: import("@playwright/test").Page) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  const button = dialog.getByRole("button", { name: "PDF herunterladen", exact: true });
  await expect(button).toBeEnabled({ timeout: 30000 });
  const expectedPages = await page
    .locator("[data-dossier-pdf-canvas]")
    .locator(
      '[data-dossier-document="cover"], [data-letter-document-pages] [data-letter-page], [data-cv-page]',
    )
    .count();
  const promise = page.waitForEvent("download", { timeout: 120000 });
  await button.click();
  const download = await promise;
  const bytes = await readFile((await download.path())!);
  const pages = await viewerText(bytes);
  expect(pages).toHaveLength(expectedPages);
  return { bytes, pages };
}

test("all 39 automatic Letter PDFs preserve literal recipient, address and salutation phrases", async ({
  page,
}) => {
  test.setTimeout(900000);
  const stored = await seedCanonicalDossier(page);
  const data = stored.letter.data;
  for (const item of GALLERY_CASES) {
    await applyGalleryCase(page, stored, item);
    // Search every Letter template through its real standalone automatic
    // exporter. Combined covers have their own safety/ordering regressions.
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const button = page.getByRole("button", { name: /Nur Motivationsschreiben als PDF/ });
    await expect(button).toBeEnabled({ timeout: 30000 });
    const expectedPages = await page
      .locator("[data-letter-standalone-export] [data-letter-document-pages] [data-letter-page]")
      .count();
    const promise = page.waitForEvent("download", { timeout: 120000 });
    await button.click();
    const download = await promise;
    const pages = await viewerText(await readFile((await download.path())!));
    expect(pages).toHaveLength(expectedPages);
    const letter = pages[0];
    for (const phrase of [data.empfaengerName, data.empfaengerAdresse, data.anrede])
      expect(letter, `${item.label}: ${phrase}`).toContain(phrase);
    expect(letter.indexOf(data.anrede), item.label).toBeLessThan(letter.indexOf(data.gruss));
    console.log("PDF WORD BOUNDARIES " + item.label + " passed");
  }
});

test("automatic PDF retains word spaces across bold, italic and whitespace-only inline nodes", async ({
  page,
}) => {
  const storage = parityStorage("brief");
  const letter = JSON.parse(storage["anschreiben:v1"]);
  const phrase = "Meine Motivation für diese Stelle.";
  const collapsedWhitespacePhrase = "Zweite Zeile mit Abstand.";
  letter.data.text = phrase + "\n" + collapsedWhitespacePhrase;
  letter.data.richTextHtml =
    "<div>Meine <strong>Motivation</strong> <em>für</em> diese Stelle.</div>" +
    "<div>Zweite <strong>Zeile</strong>\n\t<em>mit</em> Abstand.</div>";
  letter.design.recipientTypography = { fontSizePt: 11.3, italic: true };
  storage["anschreiben:v1"] = JSON.stringify(letter);
  await page.goto(BASE_URL);
  await page.evaluate((values) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, storage);
  const { bytes, pages } = await automaticPdf(page);
  expect(pages[1]).toContain(phrase);
  expect(pages[1]).toContain(collapsedWhitespacePhrase);
  expect(pages[1]).toContain(letter.data.empfaengerName);
  expect(pages[1]).toContain(letter.data.anrede);
  await test.info().attach("mixed-inline-word-boundaries", {
    body: bytes,
    contentType: "application/pdf",
  });
});
