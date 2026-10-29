import { expect, test, type Page } from "@playwright/test";
import { DEMO_CV, type CvData, type CvDesign } from "../../src/components/cv/types";
import { BASE_URL, waitEditorReady } from "../e2e/support/dossier-gallery-shared";
import { collectDocument, documentRoots } from "./pagination-browser";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import approvedProject from "../fixtures/import/modern-sidebar-from-23okt.json" with { type: "json" };

async function load(
  page: Page,
  data: CvData,
  layout = "classic",
  design: Partial<CvDesign> = {},
  extraStorage: Record<string, string> = {},
) {
  await page.goto(`${BASE_URL}/fonts/Cabin-OFL.txt`);
  await page.evaluate(
    ({ data, layout, design, extraStorage }) => {
      localStorage.clear();
      localStorage.setItem(
        "lebenslauf:v1",
        JSON.stringify({
          version: 6,
          data,
          design: {
            template: "modern",
            colors: {},
            bgOpacity: 0.25,
            useElements: false,
            ...design,
          },
          elements: [],
          elementStyles: {},
        }),
      );
      localStorage.setItem("lebenslauf:layout:v1", layout);
      localStorage.setItem("lebenslauf:photo-place:v1", JSON.stringify({ mode: "auto" }));
      for (const [key, value] of Object.entries(extraStorage)) localStorage.setItem(key, value);
    },
    { data, layout, design, extraStorage },
  );
  await page.goto(`${BASE_URL}/lebenslauf`);
  await waitEditorReady(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
  return page.locator(documentRoots("cv").web).first();
}

async function two(page: Page) {
  await page.getByRole("button", { name: "Menü", exact: true }).click();
  await page.locator('[data-cv-page-fit-mode-control="two"]').click();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-cv-page-fit-mode="two"]')).toHaveCount(0);
  await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
}

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>(
      '[data-dossier-document="cv"][data-export-mode="false"]',
    )!;
    const wrapper = root.parentElement!;
    const path = "/src/components/cv/page-fit.ts";
    const helpers = await import(path);
    return {
      saved: JSON.parse(localStorage.getItem("lebenslauf:v1")!),
      measured: helpers.measureCvPageFitSectionHeights(wrapper),
      pages: Array.from(root.querySelectorAll<HTMLElement>("[data-cv-page]")).map((sheet) => {
        const main = sheet.querySelector<HTMLElement>("[data-cv-main]")!;
        const rect = main.getBoundingClientRect();
        const height = Array.from(main.children).reduce(
          (sum, node) => sum + node.getBoundingClientRect().height,
          0,
        );
        return { text: sheet.textContent, mainFill: height / rect.height };
      }),
    };
  });
}

test("two-page: prior Masonry must not change the resulting full-width split", async ({ page }) => {
  const results = [];
  for (const compact of [false, true]) {
    const data = structuredClone(DEMO_CV);
    data.person.foto = "";
    if (compact)
      data.sectionLayouts = Object.fromEntries(
        ["sprachen", "hobbys", "staerken"].map((key) => [
          key,
          { page: 1, width: "half", positioning: "flow", packing: "masonry" },
        ]),
      );
    await load(page, data);
    const before = await snapshot(page);
    await two(page);
    const after = await snapshot(page);
    results.push({ compact, before, after });
  }
  await mkdir("artifacts/two-page-fit", { recursive: true });
  await writeFile("artifacts/two-page-fit/masonry-split.json", JSON.stringify(results, null, 2));
  expect(results[1].after.saved.data.sectionLayouts).toEqual(
    results[0].after.saved.data.sectionLayouts,
  );
});

async function checkedOutput(page: Page, expectedPages = 2) {
  for (const selector of [documentRoots("cv").web, documentRoots("cv").canonical]) {
    const pages = await collectDocument(page, selector, "cv");
    expect(pages).toHaveLength(expectedPages);
    expect(pages.flatMap((p) => p.issues)).toEqual([]);
    const text = pages.map((p) => p.text).join(" ");
    expect(text).toContain("Herr Thomas Weber");
    expect(text).toContain("Französisch");
  }
}

async function repeatAndReload(page: Page) {
  const after = (await snapshot(page)).saved;
  await two(page);
  expect((await snapshot(page)).saved).toEqual(after);
  await page.reload();
  await waitEditorReady(page);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(async () => (await snapshot(page)).saved).toEqual(after);
  await checkedOutput(page);
}

async function actualPdf(page: Page, name: string) {
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "PDF", exact: true }).click();
  const download = await downloading;
  await mkdir("artifacts/two-page-fit", { recursive: true });
  const path = resolve(`artifacts/two-page-fit/${name}.pdf`);
  await download.saveAs(path);
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(await readFile(path)), disableFontFace: true });
  const pdf = await task.promise;
  try {
    expect(pdf.numPages).toBe(2);
    const text = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const content = await (await pdf.getPage(i)).getTextContent();
      text.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    expect(text.join(" ")).toContain("Herr Thomas Weber");
    expect(text.join(" ")).toContain("Französisch");
  } finally {
    await task.destroy();
  }
}

for (const layout of ["classic", "modern"]) {
  test(`two-page ${layout}: preserves custom typography and source order, repeats and exports PDF`, async ({
    page,
  }) => {
    const data = structuredClone(DEMO_CV);
    data.person.foto = "";
    const root = await load(page, data, layout, {
      bodyScale: 1.08,
      headingScale: 1.12,
      titleScale: 1.16,
    });
    const before = (await snapshot(page)).saved;
    await two(page);
    await expect(root.locator("[data-cv-page]")).toHaveCount(2);
    const after = (await snapshot(page)).saved;
    expect(after.design).toEqual(before.design);
    expect({ ...after.data, sectionLayouts: undefined }).toEqual({
      ...before.data,
      sectionLayouts: undefined,
    });
    await checkedOutput(page);
    await repeatAndReload(page);
    await actualPdf(page, `custom-${layout}`);
  });
}

for (const mirrored of [false, true]) {
  test(`two-page long Sidebar ${mirrored ? "mobile right" : "desktop left"}: balances separately with automatic photo`, async ({
    page,
  }) => {
    if (mirrored) await page.setViewportSize({ width: 390, height: 844 });
    const data = structuredClone(DEMO_CV);
    data.person.foto = approvedProject.cv.data.person.foto;
    data.sprachen = Array.from({ length: 10 }, (_, i) => ({
      id: `language-${i}`,
      name: `Sprache ${i + 1}`,
      niveau: "Gute mündliche und schriftliche Kenntnisse",
    }));
    data.sprachen[0].name = "Französisch";
    data.hobbys = Array.from(
      { length: 12 },
      (_, i) => `Kreatives Hobby ${i + 1} mit regelmässigem Training`,
    );
    const root = await load(
      page,
      data,
      "modern",
      {},
      { "lebenslauf:info-position:v1": mirrored ? "mirrored" : "standard" },
    );
    const before = (await snapshot(page)).saved;
    await two(page);
    await expect(root.locator("[data-cv-page]")).toHaveCount(2);
    const after = (await snapshot(page)).saved;
    expect(after.data.person.foto).toBe(before.data.person.foto);
    expect(after.design).toEqual(before.design);
    await checkedOutput(page);
    await repeatAndReload(page);
    await writeFile(
      `artifacts/two-page-fit/side-${mirrored ? "right" : "left"}.json`,
      JSON.stringify({ before, after }, null, 2),
    );
  });
}

test("two-page: custom continuation top and section spacing are measured and preserved", async ({
  page,
}) => {
  const data = structuredClone(DEMO_CV);
  data.person.foto = "";
  await load(
    page,
    data,
    "classic",
    {},
    { "lebenslauf:continuation-top-margin:v1": "110", "lebenslauf:section-gap:v1": "4" },
  );
  await two(page);
  await checkedOutput(page);
  await repeatAndReload(page);
  expect(
    await page.evaluate(() => localStorage.getItem("lebenslauf:continuation-top-margin:v1")),
  ).toBe("110");
  expect(await page.evaluate(() => localStorage.getItem("lebenslauf:section-gap:v1"))).toBe("4");
});

test("two-page: an impossible fit retains the source instead of clipping or shrinking", async ({
  page,
}) => {
  const data = structuredClone(DEMO_CV);
  data.person.foto = "";
  data.erfahrung = Array.from({ length: 30 }, (_, i) => ({
    ...data.erfahrung[0],
    id: `long-${i}`,
    beschreibung: "Planung und Zusammenarbeit. ".repeat(10),
  }));
  await load(page, data);
  const before = (await snapshot(page)).saved;
  await two(page);
  expect((await snapshot(page)).saved).toEqual(before);
  await expect(
    page
      .locator('[role="status"]:visible')
      .filter({ hasText: "Dieser Inhalt passt mit deinen Einstellungen nicht auf 2 Seiten." }),
  ).toBeVisible();
  await two(page);
  expect((await snapshot(page)).saved).toEqual(before);
});

test("two-page: protects a free second-page rubric and its coordinates", async ({ page }) => {
  const data = structuredClone(DEMO_CV);
  data.person.foto = "";
  data.sectionLayouts = {
    staerken: { page: 2, positioning: "free", width: "half", x: 25, y: 80, widthMm: 65 },
  };
  await load(page, data);
  const before = (await snapshot(page)).saved;
  await two(page);
  expect((await snapshot(page)).saved.data.sectionLayouts.staerken).toEqual(
    before.data.sectionLayouts.staerken,
  );
});

test("two-page: native DOCX retains its explicit-page guard and explains the PDF alternative", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(BASE_URL);
  const reloaded = page.waitForEvent("domcontentloaded", { timeout: 20_000 });
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: "two-page.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(approvedProject)),
  });
  await reloaded;
  await page.goto(`${BASE_URL}/lebenslauf`);
  await waitEditorReady(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
  await two(page);
  await checkedOutput(page);
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const before = (await snapshot(page)).saved;
  await page.getByRole("menuitem", { name: "DOCX", exact: true }).click();
  await expect(page.getByRole("alert").last()).toContainText(
    "Fest auf Seite 2 zugewiesene CV-Rubriken sind im Word-Download noch nicht unterstützt.",
  );
  expect((await snapshot(page)).saved).toEqual(before);
  expect(before.data.person.foto).toBe(approvedProject.cv.data.person.foto);
});
