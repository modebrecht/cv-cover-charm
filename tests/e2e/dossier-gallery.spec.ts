import { expect, test, type Page } from "@playwright/test";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FRESH_TEMPLATE_REGISTRY } from "../../src/components/cover/fresh-template-registry";
import { TEMPLATES, type TemplateId } from "../../src/components/cover/types";

const BASE_URL = "http://127.0.0.1:4173";
const GALLERY_DIR = process.env.GALLERY_DIR ?? "artifacts/dossier-gallery";
const GALLERY_BATCH_SIZE = 4;
const GALLERY_BATCH_COUNT = 10;

function galleryBatchIndex(): number | null {
  const raw = process.env.GALLERY_BATCH_INDEX;
  if (raw === undefined || raw === "") return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value >= GALLERY_BATCH_COUNT) {
    throw new Error(`Invalid GALLERY_BATCH_INDEX=${raw}; expected 0-${GALLERY_BATCH_COUNT - 1}`);
  }
  return value;
}

// Keep this Node-side catalogue data-only: importing fresh-templates.ts would
// pull CSS into Playwright's test transform. Mirror the live product boundary
// explicitly instead: retired legacy ids are excluded, Fresh remains complete,
// and Edel Dark is the final registered non-Fresh template.
const RETIRED_TEMPLATE_IDS = new Set(["edelBlockig", "sonnig"]);
const ALL_GALLERY_TEMPLATES = [
  ...TEMPLATES.filter((template) => !RETIRED_TEMPLATE_IDS.has(template.id as string)).map(
    (template) => ({ id: template.id, name: template.name }),
  ),
  ...FRESH_TEMPLATE_REGISTRY,
  { id: "edelDark", name: "Edel Dark" },
];

async function extractPdfText(path: string): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await readFile(path));
  const document = await getDocument({ data, disableFontFace: true }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const pdfPage = await document.getPage(pageNumber);
    const content = await pdfPage.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" "),
    );
  }
  return pages.join("\n").replace(/\s+/g, " ").trim();
}

function withoutWhitespace(value: string): string {
  return value.replace(/\s+/g, "");
}

async function waitEditorReady(page: Page) {
  const toggle = page.getByRole("button", { name: "Download", exact: true });
  await expect(toggle).toHaveAttribute("data-editor-ready", "true", { timeout: 15_000 });
  return toggle;
}

async function loadDemoThroughUi(page: Page, route: string) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
  const toggle = await waitEditorReady(page);
  await toggle.click();
  const demo = page.getByRole("button", { name: "Beispieldaten übernehmen", exact: true });
  await expect(demo).toBeVisible();
  await demo.click();
  await page.getByRole("button", { name: "Ja", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.waitForTimeout(550);
}

async function downloadWholeDossier(page: Page, fileName: string) {
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  const card = page.getByRole("button", { name: /Gesamtdossier herunterladen/ });
  await expect(card).toContainText("Dossier prüfen & herunterladen", { timeout: 15_000 });
  await card.click();

  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Titelblatt, Motivationsschreiben");
  const button = dialog.getByRole("button", { name: "Dossier herunterladen" });
  await expect(button).toBeEnabled({ timeout: 30_000 });

  const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
  await button.click();
  const download = await downloadPromise;
  const tempPath = await download.path();
  expect(tempPath).not.toBeNull();

  await mkdir(GALLERY_DIR, { recursive: true });
  const target = join(GALLERY_DIR, fileName);
  await copyFile(tempPath ?? "", target);
  expect((await stat(target)).size).toBeGreaterThan(10_000);

  const pdfText = await extractPdfText(target);
  expect(pdfText).toContain("Bewerbung um eine Lehrstelle als Informatiker/in EFZ");
  expect(pdfText).toContain("Herr Thomas Weber");
  expect(pdfText).toContain("Guten Tag");
  expect(pdfText).toContain("Sekundarschule, Niveau A");
  // Browser-to-PDF glyph placement can make pdf.js expose adjacent visual words
  // as a single text item (e.g. `Mathematikund`). This assertion still requires
  // the complete phrase and only ignores extractor whitespace boundaries.
  expect(withoutWhitespace(pdfText)).toContain(
    withoutWhitespace("Schwerpunkt Mathematik und Informatik"),
  );
  return target;
}

function safeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

test("UI sample dossier downloads and all motivation-letter templates produce review PDFs", async ({
  page,
}) => {
  test.setTimeout(15 * 60_000);
  const batchIndex = galleryBatchIndex();

  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());

  // Every batch still follows the real student path once, then renders only its
  // assigned complete dossiers. Batching changes CI scheduling, not PDF truth.
  await loadDemoThroughUi(page, "/titelblatt");
  await loadDemoThroughUi(page, "/anschreiben");
  await loadDemoThroughUi(page, "/lebenslauf");

  const stored = await page.evaluate(() => ({
    cover: JSON.parse(localStorage.getItem("titelblatt:v3") ?? "null"),
    letter: JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null"),
    cv: JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null"),
  }));
  expect(stored.cover?.data?.vorname).toBe("Lea");
  expect(stored.letter?.data?.unterschrift).toBe("Lea Müller");
  expect(stored.cv?.data?.person?.vorname).toBe("Lea");

  const cases: Array<{
    label: string;
    letterTemplate: "brief" | TemplateId;
    coverTemplate: TemplateId;
    cvTemplate: TemplateId;
  }> = ALL_GALLERY_TEMPLATES.map((template) => ({
    label: template.name,
    letterTemplate: template.id as "brief" | TemplateId,
    coverTemplate: template.id as TemplateId,
    cvTemplate: template.id as TemplateId,
  }));

  expect(FRESH_TEMPLATE_REGISTRY).toHaveLength(18);
  expect(ALL_GALLERY_TEMPLATES).toHaveLength(37);
  expect(cases).toHaveLength(37);
  expect(cases.at(-1)?.label).toBe("Edel Dark");
  expect(ALL_GALLERY_TEMPLATES.map(({ id }) => id as string)).not.toContain("edelBlockig");
  expect(ALL_GALLERY_TEMPLATES.map(({ id }) => id as string)).not.toContain("sonnig");

  const totalPdfCount = cases.length + 1; // UI example + 37 dossier template cases.
  expect(totalPdfCount).toBe(38);
  expect(Math.ceil(totalPdfCount / GALLERY_BATCH_SIZE)).toBe(GALLERY_BATCH_COUNT);

  const batchStart = batchIndex === null ? 0 : batchIndex * GALLERY_BATCH_SIZE;
  const batchEnd =
    batchIndex === null ? totalPdfCount : Math.min(batchStart + GALLERY_BATCH_SIZE, totalPdfCount);
  const includeSample = batchIndex === null || batchStart === 0;
  const caseStart = batchIndex === null ? 0 : Math.max(0, batchStart - 1);
  const caseEnd = batchIndex === null ? cases.length : Math.max(0, batchEnd - 1);
  const selectedCases = cases.slice(caseStart, caseEnd).map((item, offset) => ({
    item,
    globalIndex: caseStart + offset,
  }));

  const manifestEntries: string[] = [];

  if (includeSample) {
    await downloadWholeDossier(page, "00-Beispieldossier-E2E.pdf");
    manifestEntries.push(
      "00-Beispieldossier-E2E.pdf | echter UI-E2E: Titelblatt + Motivationsschreiben + Lebenslauf per Beispieldaten übernehmen",
    );
  }

  for (const { item, globalIndex } of selectedCases) {
    await page.evaluate(
      ({ base, letterTemplate, coverTemplate, cvTemplate }) => {
        const cover = structuredClone(base.cover);
        const letter = structuredClone(base.letter);
        const cv = structuredClone(base.cv);

        cover.template = coverTemplate;
        letter.design.template = letterTemplate;
        letter.design.colors =
          letterTemplate === "brief"
            ? {
                bg: "#ffffff",
                ink: "#111111",
                primary: "#111111",
                secondary: "#111111",
                accent: "#111111",
                cvInk: "#111111",
                cvMuted: "#4b5563",
                cvHeading: "#111111",
              }
            : { ...(cover.colors?.[letterTemplate] ?? letter.design.colors) };
        cv.design.template = cvTemplate;
        cv.design.colors = { ...(cover.colors?.[cvTemplate] ?? cv.design.colors) };

        localStorage.setItem("titelblatt:v3", JSON.stringify(cover));
        localStorage.setItem("anschreiben:v1", JSON.stringify(letter));
        localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
      },
      {
        base: stored,
        letterTemplate: item.letterTemplate,
        coverTemplate: item.coverTemplate,
        cvTemplate: item.cvTemplate,
      },
    );

    const fileNumber = String(globalIndex + 1).padStart(2, "0");
    const fileName = `${fileNumber}-${safeName(item.label)}.pdf`;
    await downloadWholeDossier(page, fileName);
    manifestEntries.push(`${fileName} | ${item.label}`);
  }

  await mkdir(GALLERY_DIR, { recursive: true });
  await writeFile(
    join(
      GALLERY_DIR,
      batchIndex === null
        ? "MANIFEST.txt"
        : `MANIFEST.part-${String(batchIndex).padStart(2, "0")}.txt`,
    ),
    `${manifestEntries.join("\n")}\n`,
    "utf8",
  );
});