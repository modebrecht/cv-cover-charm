import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  GALLERY_CASES,
  assertGalleryCatalog,
  waitEditorReady,
} from "../e2e/support/dossier-gallery-shared";
import { paginationFixture, type PaginationFixture } from "./pagination-fixtures";
import { collectDocument, documentRoots, loadFixture } from "./pagination-browser";

assertGalleryCatalog();
const selected = process.env.ONE_PAGE_QA_TEMPLATES?.split(",");
const directory = "artifacts/one-page-matrix";

async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("lebenslauf:v1")!));
}

async function presentation(page: Page) {
  return page.evaluate(() =>
    Object.fromEntries(
      [
        "lebenslauf:layout:v1",
        "lebenslauf:info-position:v1",
        "lebenslauf:layout-mirror:v1",
        "lebenslauf:section-gap:v1",
        "bewerbungsdossier:page-margins:v1",
        "lebenslauf:photo-place:v1",
        "lebenslauf:placement:v1",
      ].map((key) => [key, localStorage.getItem(key)]),
    ),
  );
}

async function fit(page: Page) {
  await page.getByRole("button", { name: "Menü", exact: true }).click();
  await page.locator('[data-cv-page-fit-mode-control="one"]').click();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-cv-page-fit-mode="one"]')).toHaveCount(0);
  await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
}

async function outputs(page: Page, fixture: PaginationFixture) {
  const documents = [];
  for (const selector of [documentRoots("cv").web, documentRoots("cv").canonical]) {
    const pages = await collectDocument(page, selector, "cv");
    const text = pages.map((p) => p.text).join(" ");
    for (const marker of fixture.markers.cv) expect(text).toContain(marker);
    expect(pages.flatMap((p) => p.issues)).toEqual([]);
    documents.push(pages);
  }
  expect(documents[0].length).toBe(documents[1].length);
  return documents;
}

async function downloadPdf(page: Page, fixture: PaginationFixture, name: string, pages: number) {
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "PDF", exact: true }).click();
  const download = await downloading;
  const path = resolve(directory, `${name}.pdf`);
  await download.saveAs(path);
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(await readFile(path)), disableFontFace: true });
  const pdf = await task.promise;
  try {
    expect(pdf.numPages).toBe(pages);
    const texts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const content = await (await pdf.getPage(i)).getTextContent();
      texts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    for (const marker of fixture.markers.cv) expect(texts.join(" ")).toContain(marker);
  } finally {
    await task.destroy();
  }
}

function sourceWithoutLayouts(value: Record<string, unknown>) {
  return { ...value, sectionLayouts: undefined };
}

async function exercise(
  page: Page,
  fixture: PaginationFixture,
  name: string,
  alreadyFits: boolean,
) {
  await loadFixture(page, fixture, "cv");
  await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
  const before = await saved(page);
  const beforePresentation = await presentation(page);
  const root = page.locator(documentRoots("cv").web).first();
  const beforePages = await root.locator("[data-cv-page]").count();
  if (alreadyFits) expect(beforePages).toBe(1);
  await fit(page);
  const after = await saved(page);
  await expect(root.locator("[data-cv-page]").first()).toBeVisible();
  const afterPages = await root.locator("[data-cv-page]").count();
  expect(await presentation(page)).toEqual(beforePresentation);
  expect(sourceWithoutLayouts(after.data)).toEqual(sourceWithoutLayouts(before.data));
  if (alreadyFits || afterPages > 1) expect(after).toEqual(before);
  if (afterPages === 1) {
    for (const key of ["titleScale", "headingScale", "bodyScale"]) {
      const previous = before.design[key] ?? 1;
      expect(after.design[key] ?? 1).toBeLessThanOrEqual(previous);
      expect(after.design[key] ?? 1).toBeGreaterThanOrEqual(Math.max(0.75, previous * 0.82) - 1e-6);
    }
    await outputs(page, fixture);
  } else {
    await expect(
      page.locator('[role="status"]:visible').filter({
        hasText: "Dieser Inhalt braucht mehr Platz. Bitte kürzen oder auf 2 Seiten verteilen.",
      }),
    ).toBeVisible();
  }
  await fit(page);
  expect(await saved(page)).toEqual(after);
  await page.reload();
  await waitEditorReady(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(root.locator("[data-cv-page]")).toHaveCount(afterPages);
  await expect.poll(() => saved(page)).toEqual(after);
  if (afterPages === 1) await outputs(page, fixture);
  await mkdir(directory, { recursive: true });
  await writeFile(
    `${directory}/${name}.json`,
    JSON.stringify(
      { beforePages, afterPages, before, after, presentation: beforePresentation },
      null,
      2,
    ),
  );
  return afterPages;
}

for (const item of GALLERY_CASES.filter((item) => !selected || selected.includes(item.id))) {
  test(`one-page matrix ${item.id}: fitting custom typography is unchanged`, async ({ page }) => {
    const fixture = paginationFixture(item.id, { works: 1, schools: 1 });
    const cv = JSON.parse(fixture.storage["lebenslauf:v1"]);
    Object.assign(cv.design, { titleScale: 1.06, headingScale: 1.04, bodyScale: 1.02 });
    cv.data.erfahrung[0].beschreibung = "QADESC001 Kurze praktische Aufgaben. QAEND001";
    fixture.storage["lebenslauf:v1"] = JSON.stringify(cv);
    await exercise(page, fixture, `${item.id}-fitting`, true);
  });

  test(`one-page matrix ${item.id}: dense source fits minimally or stays unchanged`, async ({
    page,
  }) => {
    await exercise(
      page,
      paginationFixture(item.id, { works: 7, schools: 1 }),
      `${item.id}-dense`,
      false,
    );
  });
}

for (const layout of ["classic", "minimal", "editorial", "modern"] as const) {
  test(`one-page custom margins ${layout}: typography, margins and section gap survive`, async ({
    page,
  }) => {
    const fixture = paginationFixture("modern", { works: 4, schools: 1, layout });
    fixture.storage["bewerbungsdossier:page-margins:v1"] = JSON.stringify({
      cv: { top: 58, right: 23, bottom: 1, left: 27 },
    });
    fixture.storage["lebenslauf:section-gap:v1"] = "4";
    const pages = await exercise(page, fixture, `margins-${layout}`, false);
    if (layout === "classic" || layout === "modern")
      await downloadPdf(page, fixture, `margins-${layout}`, pages);
  });
}

for (const template of ["studio3", "citrus", "ribbon", "ledger"]) {
  test(`one-page boundary ${template}: fits the first actual overflow without excessive shrinking`, async ({
    page,
  }) => {
    const calibration: { works: number; pages: number }[] = [];
    const count = async (works: number) => {
      await loadFixture(page, paginationFixture(template, { works, schools: 1 }), "cv");
      const pages = await page.locator(`${documentRoots("cv").web} [data-cv-page]`).count();
      calibration.push({ works, pages });
      return pages;
    };
    let low = 1,
      high = 8;
    expect(await count(low)).toBe(1);
    expect(await count(high)).toBeGreaterThan(1);
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if ((await count(middle)) > 1) high = middle;
      else low = middle + 1;
    }
    expect(
      await exercise(
        page,
        paginationFixture(template, { works: low, schools: 1 }),
        `boundary-${template}`,
        false,
      ),
    ).toBe(1);
    await writeFile(
      `${directory}/boundary-${template}-calibration.json`,
      JSON.stringify(calibration, null, 2),
    );
  });
}

for (const mirrored of [false, true]) {
  test(`one-page Sidebar ${mirrored ? "right" : "left"}: automatic portrait and long Sidebar use actual capacity`, async ({
    page,
  }) => {
    const fixture = paginationFixture("modern", {
      works: 1,
      schools: 1,
      layout: "modern",
      mirrored,
      custom: true,
    });
    const cv = JSON.parse(fixture.storage["lebenslauf:v1"]);
    cv.data.sprachen = Array.from({ length: 12 }, (_, i) => ({
      id: `lang-${i}`,
      name: `Sprache ${i + 1}`,
      niveau: "Gute mündliche und schriftliche Kenntnisse",
    }));
    cv.data.sectionLayouts = { sprachen: { page: 2 }, hobbys: { page: 2 }, staerken: { page: 2 } };
    fixture.storage["lebenslauf:v1"] = JSON.stringify(cv);
    fixture.storage["lebenslauf:photo-place:v1"] = JSON.stringify({ mode: "auto" });
    await exercise(page, fixture, `portrait-${mirrored ? "right" : "left"}`, false);
  });
}
