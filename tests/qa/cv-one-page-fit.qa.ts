import { expect, test, type Page } from "@playwright/test";
import { DEMO_CV, cvSectionOrder, type CvData, type CvDesign } from "../../src/components/cv/types";
import { BASE_URL, waitEditorReady } from "../e2e/support/dossier-gallery-shared";
import { collectDocument, documentRoots } from "./pagination-browser";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import approvedProject from "../fixtures/import/modern-sidebar-from-23okt.json" with { type: "json" };
import { readZipEntries } from "../../src/lib/docx-next/zip";

function fixture() {
  const data = structuredClone(DEMO_CV);
  data.person.foto = "";
  data.schule = data.schule.slice(0, 1);
  data.erfahrung = data.erfahrung.slice(0, 1);
  return data;
}

async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("lebenslauf:v1")!));
}

async function load(
  page: Page,
  data: CvData,
  layout: string,
  design: Partial<CvDesign> = {},
  mirrored = false,
) {
  await page.goto(`${BASE_URL}/fonts/Cabin-OFL.txt`);
  await page.evaluate(
    ({ data, layout, design, mirrored }) => {
      localStorage.clear();
      localStorage.setItem(
        "lebenslauf:v1",
        JSON.stringify({
          version: 2,
          data,
          design: {
            template: "modern",
            colors: {},
            bgOpacity: 0.06,
            useElements: false,
            ...design,
          },
          elements: [],
        }),
      );
      localStorage.setItem("lebenslauf:layout:v1", layout);
      localStorage.setItem("lebenslauf:photo-place:v1", JSON.stringify({ mode: "auto" }));
      localStorage.setItem("lebenslauf:info-position:v1", mirrored ? "mirrored" : "standard");
    },
    { data, layout, design, mirrored },
  );
  await page.goto(`${BASE_URL}/lebenslauf`);
  await waitEditorReady(page);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(async () => (await saved(page)).design.font).toBe("freundlich");
  return page.locator(documentRoots("cv").web).first();
}

async function fit(page: Page) {
  await page.getByRole("button", { name: "Menü", exact: true }).click();
  await page.locator('[data-cv-page-fit-mode-control="one"]').click();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-cv-page-fit-mode="one"]')).toHaveCount(0);
  await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
}

function withExperienceCount(count: number) {
  const data = fixture();
  data.erfahrung = Array.from({ length: count }, (_, i) => ({
    ...data.erfahrung[0],
    id: `exp-${i}`,
    titel: `Praxiserfahrung ${i + 1}`,
    beschreibung:
      "Zusammenarbeit und selbstständige Planung und Dokumentation von Aufgaben. ".repeat(2),
  }));
  return data;
}

async function checkOutput(page: Page) {
  for (const selector of [documentRoots("cv").web, documentRoots("cv").canonical]) {
    const output = await collectDocument(page, selector, "cv");
    expect(output).toHaveLength(1);
    expect(output.flatMap((p) => p.issues)).toEqual([]);
  }
}

async function evidence(page: Page, name: string, before: unknown) {
  await mkdir("artifacts/one-page-fit", { recursive: true });
  const root = page.locator(documentRoots("cv").web).first();
  await root.screenshot({ path: `artifacts/one-page-fit/${name}.png` });
  await writeFile(
    `artifacts/one-page-fit/${name}.json`,
    JSON.stringify({ before, after: await saved(page) }, null, 2),
  );
}

async function pdf(page: Page, name: string) {
  await mkdir("artifacts/one-page-fit", { recursive: true });
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "PDF", exact: true }).click();
  const download = await downloadPromise;
  const path = resolve(`artifacts/one-page-fit/${name}.pdf`);
  await download.saveAs(path);
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(await readFile(path)), disableFontFace: true });
  const result = await task.promise;
  try {
    expect(result.numPages).toBe(1);
    const content = await (await result.getPage(1)).getTextContent();
    return content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
  } finally {
    await task.destroy();
  }
}

for (const layout of ["classic", "modern"]) {
  test(`one-page ${layout}: already fitting preserves design and layout exactly`, async ({
    page,
  }) => {
    const root = await load(page, fixture(), layout, {
      titleScale: 1.12,
      headingScale: 1.08,
      bodyScale: 1.04,
    });
    await expect(root.locator("[data-cv-page]")).toHaveCount(1);
    const before = await saved(page);
    await fit(page);
    await expect(root.locator("[data-cv-page]")).toHaveCount(1);
    expect(await saved(page)).toEqual(before);
    await fit(page);
    expect(await saved(page)).toEqual(before);
    await page.reload();
    await waitEditorReady(page);
    expect(await saved(page)).toEqual(before);
  });
}

test("one-page Sidebar: removes page assignments without changing typography or width", async ({
  page,
}) => {
  const data = fixture();
  data.sectionLayouts = Object.fromEntries(
    cvSectionOrder(data).map((key, index) => [
      key,
      {
        page: index > 3 ? 2 : 1,
        width: "full",
        packing: "rows",
        positioning: "flow",
      },
    ]),
  );
  const root = await load(page, data, "modern", { bodyScale: 1.04 });
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  const before = await saved(page);
  await fit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(1);
  const after = await saved(page);
  expect(after.design).toEqual(before.design);
  expect({ ...after.data, sectionLayouts: undefined }).toEqual({
    ...before.data,
    sectionLayouts: undefined,
  });
  for (const key of cvSectionOrder(data)) expect(after.data.sectionLayouts[key].page).toBe(1);
  for (const selector of [documentRoots("cv").web, documentRoots("cv").canonical]) {
    const output = await collectDocument(page, selector, "cv");
    expect(output).toHaveLength(1);
    expect(output.flatMap((p) => p.issues)).toEqual([]);
  }
});

test("one-page classic: packs only when necessary and keeps the original font sizes", async ({
  page,
}) => {
  const root = await load(page, withExperienceCount(6), "classic");
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  const before = await saved(page);
  await fit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(1);
  const after = await saved(page);
  expect(after.design).toEqual(before.design);
  expect(after.data.sectionLayouts.sprachen.packing).toBe("masonry");
  expect({ ...after.data, sectionLayouts: undefined }).toEqual({
    ...before.data,
    sectionLayouts: undefined,
  });
  await checkOutput(page);
  await fit(page);
  expect(await saved(page)).toEqual(after);
  await page.reload();
  await waitEditorReady(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(1);
  expect(await saved(page)).toEqual(after);
  await evidence(page, "packed-classic", before);
  const text = await pdf(page, "packed-classic");
  for (let i = 1; i <= 6; i++) expect(text).toContain(`Praxiserfahrung ${i}`);
});

test("one-page Sidebar: a small measured overflow only needs a small reduction", async ({
  page,
}) => {
  const root = await load(page, withExperienceCount(7), "modern");
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  const before = await saved(page);
  await fit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(1);
  const after = await saved(page);
  expect(after.design.bodyScale).toBeLessThan(1);
  expect(after.design.bodyScale).toBeGreaterThanOrEqual(0.98);
  expect(after.data).toEqual(before.data);
  await checkOutput(page);
  await fit(page);
  expect(await saved(page)).toEqual(after);
  await page.reload();
  await waitEditorReady(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(1);
  expect(await saved(page)).toEqual(after);
  await evidence(page, "minimal-sidebar", before);
  const text = await pdf(page, "minimal-sidebar");
  for (let i = 1; i <= 7; i++) expect(text).toContain(`Praxiserfahrung ${i}`);
});

test("one-page classic: preserves existing half-width layout when it already fits", async ({
  page,
}) => {
  const data = fixture();
  data.sectionLayouts = Object.fromEntries(
    ["sprachen", "hobbys", "staerken"].map((key) => [
      key,
      {
        page: 1,
        width: "half",
        positioning: "flow",
        packing: "rows",
      },
    ]),
  );
  const root = await load(page, data, "classic");
  await expect(root.locator("[data-cv-page]")).toHaveCount(1);
  const before = await saved(page);
  await fit(page);
  expect(await saved(page)).toEqual(before);
});

test("one-page: impossible fit discards trials and repeated clicks cannot keep shrinking", async ({
  page,
}) => {
  const root = await load(page, withExperienceCount(30), "modern");
  const before = await saved(page);
  await fit(page);
  expect(await saved(page)).toEqual(before);
  await expect(
    page.locator('[role="status"]:visible').filter({
      hasText: "Dieser Inhalt braucht mehr Platz. Bitte kürzen oder auf 2 Seiten verteilen.",
    }),
  ).toBeVisible();
  expect(await root.locator("[data-cv-page]").count()).toBeGreaterThan(1);
  await fit(page);
  expect(await saved(page)).toEqual(before);
});

test("one-page: preserves free sections on page two without shrinking the remaining CV", async ({
  page,
}) => {
  const data = fixture();
  data.sectionLayouts = {
    staerken: { page: 2, width: "half", positioning: "free", x: 20, y: 40, widthMm: 65 },
  };
  const root = await load(page, data, "modern");
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  const before = await saved(page);
  await fit(page);
  expect(await saved(page)).toEqual(before);
  await expect(root.locator('[data-cv-page="1"] [data-cv-free-section="staerken"]')).toHaveCount(1);
  await expect(
    page
      .locator('[role="status"]:visible')
      .filter({ hasText: "Frei platzierte Inhalte auf Seite 2 bleiben erhalten." }),
  ).toBeVisible();
});

test("one-page mobile mirrored Sidebar: measures in document coordinates and stays idempotent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const root = await load(page, withExperienceCount(7), "modern", {}, true);
  await expect(root).toHaveAttribute("data-cv-mirrored", "true");
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  await fit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(1);
  const after = await saved(page);
  expect(after.design.bodyScale).toBeGreaterThanOrEqual(0.98);
  await checkOutput(page);
  await fit(page);
  expect(await saved(page)).toEqual(after);
});

test("one-page imported dossier: native DOCX keeps all fields and the original photo", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  const input = structuredClone(approvedProject);
  input.cv.data.sectionLayouts = Object.fromEntries(
    cvSectionOrder(input.cv.data as CvData).map((key, index) => [
      key,
      {
        page: index > 3 ? 2 : 1,
        width: "full",
        packing: "rows",
        positioning: "flow",
      },
    ]),
  );
  await page.goto(BASE_URL);
  await expect(page.getByRole("button", { name: "Dossier laden", exact: true })).toBeVisible();
  const reloaded = page.waitForEvent("domcontentloaded", { timeout: 20_000 });
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: "one-page.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(input)),
  });
  await reloaded;
  await page.goto(`${BASE_URL}/lebenslauf`);
  await waitEditorReady(page);
  await page.evaluate(() => document.fonts.ready);
  const root = page.locator(documentRoots("cv").web).first();
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
  const before = await saved(page);
  await fit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(1);
  expect((await saved(page)).design).toEqual(before.design);
  expect((await saved(page)).data.person.foto).toBe(input.cv.data.person.foto);
  await checkOutput(page);
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const downloading = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("menuitem", { name: "DOCX", exact: true }).click();
  const download = await downloading;
  await mkdir("artifacts/one-page-fit", { recursive: true });
  const path = resolve("artifacts/one-page-fit/native-one-page.docx");
  await download.saveAs(path);
  const entries = readZipEntries(await readFile(path));
  const xml = entries
    .filter((entry) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(entry.name))
    .map((entry) => new TextDecoder().decode(entry.bytes))
    .join("\n");
  expect(xml).toContain('name="cv.person.photo"');
  for (const expected of [
    input.cv.data.person.vorname,
    input.cv.data.person.nachname,
    ...input.cv.data.erfahrung.map((entry) => entry.titel),
    ...input.cv.data.sprachen.map((entry) => entry.name),
  ])
    expect(xml).toContain(expected);
  expect(xml).not.toContain(input.letter.data.betreff);
});
