import { expect, type Page } from "@playwright/test";
import { readFile, stat } from "node:fs/promises";

export const PDF_RICHTEXT_BASE_URL = "http://127.0.0.1:4173";
export const LETTER_PDF_PAGE = 2;

export type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
};

export function richtextLetterPayload({
  text,
  richTextHtml,
  template = "modern",
  font = "freundlich",
}: {
  text: string;
  richTextHtml: string;
  template?: string;
  font?: string;
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
      font,
      fontOverride: null,
      senderAlign: "left",
      recipientAlign: "left",
      dateAlign: "left",
      ruleAfterSender: false,
      ruleAfterRecipient: false,
      ruleAfterSubject: false,
      headerMode: template === "brief" ? "none" : "compact",
      headerShowName: true,
      headerShowAddress: true,
      headerShowPhone: true,
      headerShowEmail: true,
      footerMode: template === "brief" ? "none" : "compact",
    },
  };
}

function coverPayload() {
  return {
    version: 7,
    template: "modern",
    colors: {
      modern: { bg: "#ffffff", primary: "#24364b", accent: "#d6a47d" },
    },
    layout: { modern: {} },
    customs: [],
    fontScale: 1.2,
    font: "sans",
    data: {
      meta: { title: "", author: "", subject: "", keywords: "" },
      kicker: "Bewerbung um eine Lehrstelle als",
      eyebrow: "Bewerbung",
      beruf: "Zimmermann EFZ",
      lehrbeginn: "Lehrbeginn August 2027",
      vorname: "Sandro",
      nachname: "Müller",
      adresse: "Wylweg 15",
      plzOrt: "4533 Riedholz",
      telefon: "0798150037",
      email: "saendu.mueller@gmail.com",
      geburtsdatum: "14.03.2010",
      lehrbetrieb: "Schmid Holzbau",
      ansprechperson: "Herr Peter Schmid",
      betriebAdresse: "Industriestrasse 3, 4524 Günsberg",
      ort: "Hubersdorf",
      datum: "15.09.2026",
      labelKontakt: "",
      labelEmpfaenger: "",
      foto: null,
    },
  };
}

function cvPayload() {
  return {
    version: 6,
    data: {
      titel: "Lebenslauf",
      person: {
        vorname: "Sandro",
        nachname: "Müller",
        adresse: "Wylweg 15",
        plzOrt: "4533 Riedholz",
        telefon: "0798150037",
        email: "saendu.mueller@gmail.com",
        geburtsdatum: "14.03.2010",
        nationalitaet: "Schweiz",
        untertitel: "Schüler",
        foto: null,
      },
      schule: [
        {
          id: "school-1",
          zeit: "2023 – heute",
          titel: "Sekundarschule",
          ort: "Solothurn",
          beschreibung: "Allgemeinbildung und Berufsvorbereitung.",
        },
      ],
      erfahrung: [],
      sprachen: [{ id: "de", name: "Deutsch", niveau: "Muttersprache" }],
      hobbys: ["Fussball"],
      staerken: ["Zuverlässig"],
      referenzen: [],
      labels: {},
      hidden: {},
    },
    design: {
      template: "modern",
      colors: { primary: "#24364b", accent: "#d6a47d", bg: "#ffffff" },
      font: "freundlich",
      bgOpacity: 0.25,
      useElements: false,
    },
    elements: [],
    elementStyles: {},
  };
}

export async function seedRichtextDossier(
  page: Page,
  letter: ReturnType<typeof richtextLetterPayload>,
  hyphenationEnabled = true,
) {
  await page.goto(PDF_RICHTEXT_BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ letterState, coverState, cvState, hyphenation }) => {
      localStorage.clear();
      localStorage.setItem("anschreiben:v1", JSON.stringify(letterState));
      localStorage.setItem("titelblatt:v3", JSON.stringify(coverState));
      localStorage.setItem("lebenslauf:v1", JSON.stringify(cvState));
      localStorage.setItem("lebenslauf:layout:v1", "classic");
      localStorage.setItem(
        "bewerbungsdossier:hyphenation:v1",
        JSON.stringify({ version: 1, enabled: hyphenation }),
      );
    },
    {
      letterState: letter,
      coverState: coverPayload(),
      cvState: cvPayload(),
      hyphenation: hyphenationEnabled,
    },
  );
}

export async function downloadCombinedDossierPdf(
  page: Page,
  beforeConfirm?: (page: Page) => Promise<void>,
) {
  await page.goto(`${PDF_RICHTEXT_BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });
  const downloadToggle = page.locator("button[data-editor-ready]");
  await expect(downloadToggle).toHaveAttribute("data-editor-ready", "true", { timeout: 20_000 });
  await downloadToggle.click();

  const menu = page.locator("[data-editor-action-menu]");
  await expect(menu).toBeVisible();
  const fullPdfButton = menu.getByRole("button", { name: /Ganzes Dossier als PDF/i });
  await expect(fullPdfButton).toBeEnabled({ timeout: 20_000 });
  await fullPdfButton.click();

  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(dialog).toBeVisible();
  if (beforeConfirm) await beforeConfirm(page);
  const confirm = dialog.getByRole("button", { name: "Dossier herunterladen" });
  await expect(confirm).toBeEnabled({ timeout: 20_000 });

  const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });
  await confirm.click();
  const file = await downloadPromise;
  const path = await file.path();
  expect(path).not.toBeNull();
  expect((await stat(path ?? "")).size).toBeGreaterThan(8_000);
  return path ?? "";
}

export async function extractPdfPageItems(
  path: string,
  pageNumber = LETTER_PDF_PAGE,
): Promise<PdfTextItem[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await readFile(path));
  const document = await getDocument({ data, disableFontFace: true }).promise;
  const pdfPage = await document.getPage(pageNumber);
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

export function normalizePdfText(value: string) {
  return value.replace(/[\s\u00ad-]+/g, "");
}

export function contributingPdfBaselines(items: PdfTextItem[], target: string) {
  let stream = "";
  const spans: Array<{ start: number; end: number; y: number; str: string }> = [];
  for (const item of items) {
    const clean = normalizePdfText(item.str);
    if (!clean) continue;
    const start = stream.length;
    stream += clean;
    spans.push({ start, end: stream.length, y: item.y, str: item.str });
  }
  const normalizedTarget = normalizePdfText(target);
  const targetStart = stream.indexOf(normalizedTarget);
  expect(targetStart, `${target} must remain extractable from the PDF text layer`).toBeGreaterThanOrEqual(0);
  const targetEnd = targetStart + normalizedTarget.length;
  return spans.filter((span) => span.end > targetStart && span.start < targetEnd);
}

export async function pdfPageStrokeCount(path: string, pageNumber = LETTER_PDF_PAGE) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await readFile(path));
  const document = await pdfjs.getDocument({ data, disableFontFace: true }).promise;
  const pdfPage = await document.getPage(pageNumber);
  const operators = await pdfPage.getOperatorList();
  const strokeOp = (pdfjs as unknown as { OPS?: { stroke?: number } }).OPS?.stroke;
  if (strokeOp === undefined) return operators.fnArray.length;
  return operators.fnArray.filter((operation) => operation === strokeOp).length;
}
