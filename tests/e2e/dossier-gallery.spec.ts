import { expect, test, type Page } from "@playwright/test";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { TEMPLATES, type TemplateId } from "../../src/components/cover/types";

const BASE_URL = "http://127.0.0.1:4173";
const GALLERY_DIR = process.env.GALLERY_DIR ?? "artifacts/dossier-gallery";

// Do not import fresh-templates.ts in the Playwright Node process: that module
// intentionally imports the browser CSS for the fresh designs. The running app
// registers the same 18 designs; this list only enumerates them for gallery files.
const FRESH_GALLERY_TEMPLATES: Array<{ id: TemplateId; name: string }> = [
  { id: "edge" as TemplateId, name: "Edge" },
  { id: "glow" as TemplateId, name: "Glow" },
  { id: "frame" as TemplateId, name: "Frame" },
  { id: "monoLuxe" as TemplateId, name: "Mono Luxe" },
  { id: "horizon" as TemplateId, name: "Horizon" },
  { id: "sunrise" as TemplateId, name: "Sunrise" },
  { id: "forestFlow" as TemplateId, name: "Forest Flow" },
  { id: "violetPulse" as TemplateId, name: "Violet Pulse" },
  { id: "studio2" as TemplateId, name: "Studio 2" },
  { id: "studio3" as TemplateId, name: "Studio 3" },
  { id: "warm2" as TemplateId, name: "Warm 2" },
  { id: "warm3" as TemplateId, name: "Warm 3" },
  { id: "ledger" as TemplateId, name: "Ledger" },
  { id: "prism" as TemplateId, name: "Prism" },
  { id: "gallery" as TemplateId, name: "Gallery" },
  { id: "orbit" as TemplateId, name: "Orbit" },
  { id: "ribbon" as TemplateId, name: "Ribbon" },
  { id: "cove" as TemplateId, name: "Cove" },
];

const ALL_GALLERY_TEMPLATES = [
  ...TEMPLATES.map((template) => ({ id: template.id, name: template.name })),
  ...FRESH_GALLERY_TEMPLATES,
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
  // The old gallery gate only proved that the letter existed. A completely
  // blank CV therefore passed as green. Require content that exists only in
  // the CV sample so every generated dossier verifies the final pages too.
  expect(pdfText).toContain("Sekundarschule, Niveau A");
  expect(pdfText).toContain("Schwerpunkt Mathematik und Informatik");
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
  test.setTimeout(25 * 60_000);
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());

  // Real student path: every workspace fills itself through its visible UI.
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

  const manifest: string[] = [
    "Gesamtdossier PDF Galerie",
    "",
    "00-Beispieldossier-E2E.pdf | echter UI-E2E: Titelblatt + Motivationsschreiben + Lebenslauf per Beispieldaten übernehmen",
  ];
  await downloadWholeDossier(page, "00-Beispieldossier-E2E.pdf");

  const cases: Array<{
    label: string;
    letterTemplate: "brief" | TemplateId;
    coverTemplate: TemplateId;
    cvTemplate: TemplateId;
  }> = [
    {
      label: "Brief",
      letterTemplate: "brief",
      coverTemplate: "klassisch",
      cvTemplate: "klassisch",
    },
    ...ALL_GALLERY_TEMPLATES.map((template) => ({
      label: template.name,
      letterTemplate: template.id,
      coverTemplate: template.id,
      cvTemplate: template.id,
    })),
  ];

  expect(ALL_GALLERY_TEMPLATES).toHaveLength(37);
  expect(cases).toHaveLength(38);

  for (const [index, item] of cases.entries()) {
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

    const number = String(index + 1).padStart(2, "0");
    const fileName = `${number}-${safeName(item.label)}.pdf`;
    await downloadWholeDossier(page, fileName);
    manifest.push(
      `${fileName} | Titelblatt=${item.coverTemplate} | Motivationsschreiben=${item.letterTemplate} | CV=${item.cvTemplate}`,
    );
  }

  await writeFile(join(GALLERY_DIR, "MANIFEST.txt"), `${manifest.join("\n")}\n`, "utf8");

  const files = await import("node:fs/promises").then(({ readdir }) => readdir(GALLERY_DIR));
  expect(files.filter((file) => file.toLowerCase().endsWith(".pdf"))).toHaveLength(39);
  expect(files).toContain("MANIFEST.txt");
});
