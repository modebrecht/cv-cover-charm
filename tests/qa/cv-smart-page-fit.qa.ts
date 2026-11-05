import { expect, test, type Page } from "@playwright/test";
import {
  DEMO_CV,
  CV_SECTION_ORDER,
  cvSectionOrder,
  type CvData,
  type CvDesign,
} from "../../src/components/cv/types";
import { BASE_URL, waitEditorReady } from "../e2e/support/dossier-gallery-shared";
import { collectDocument, documentRoots } from "./pagination-browser";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import approvedProject from "../fixtures/import/modern-sidebar-from-23okt.json" with { type: "json" };
import { readZipEntries } from "../../src/lib/docx-next/zip";

function splitFixture() {
  const data = structuredClone(DEMO_CV);
  data.person.foto = "";
  data.sectionLayouts = Object.fromEntries(
    cvSectionOrder(data).map((key, index) => [
      key,
      { page: index > 3 ? 2 : 1, width: "full", packing: "rows", positioning: "flow" },
    ]),
  );
  return data;
}

async function load(
  page: Page,
  data: CvData,
  layout = "modern",
  side = "left",
  extraStorage: Record<string, string> = {},
  design: Partial<CvDesign> = {},
) {
  await page.goto(`${BASE_URL}/fonts/Cabin-OFL.txt`);
  await page.evaluate(
    ({ data, layout, side, extraStorage, design }) => {
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
      localStorage.setItem(
        "lebenslauf:info-position:v1",
        side === "right" ? "mirrored" : "standard",
      );
      for (const [key, value] of Object.entries(extraStorage)) localStorage.setItem(key, value);
    },
    { data, layout, side, extraStorage, design },
  );
  await page.goto(`${BASE_URL}/lebenslauf`);
  await waitEditorReady(page);
  await page.evaluate(() => document.fonts.ready);
  const root = page.locator(documentRoots("cv").web).first();
  await expect(root.locator("[data-cv-page]").first()).toBeVisible();
  // The editor normalizes legacy presentation defaults before its first
  // autosave. Compare fitting with that settled state, not the raw import.
  await expect.poll(async () => (await saved(page)).design.font).toBe("freundlich");
  return root;
}

async function autoFit(page: Page) {
  await page.getByRole("button", { name: "Menü", exact: true }).click();
  await page.locator('[data-cv-page-fit-mode-control="auto"]').click();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-cv-page-fit-mode="auto"]')).toHaveCount(0);
  await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
}

async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("lebenslauf:v1")!));
}

function denseFixture(count: number) {
  const data = splitFixture();
  data.schule = data.schule.slice(0, 1);
  data.erfahrung = Array.from({ length: count }, (_, index) => ({
    ...data.erfahrung[0],
    id: `retained-experience-${index}`,
    titel: `Praxiserfahrung ${index + 1}`,
    beschreibung:
      "Zusammenarbeit und selbstständige Planung und Dokumentation von Aufgaben. ".repeat(2),
  }));
  for (const layout of Object.values(data.sectionLayouts!)) layout!.page = 1;
  return data;
}

function unevenMasonryFixture(targetPage: 1 | 2 = 1) {
  const data = structuredClone(DEMO_CV);
  data.person.foto = "";
  data.hidden = Object.fromEntries(CV_SECTION_ORDER.map((key) => [key, true]));
  data.customSections = [
    {
      id: "tall-a",
      title: "Ausführliches Projekt",
      description: "Planung und Dokumentation gemeinsamer Aufgaben. ".repeat(16),
    },
    { id: "short-b", title: "Kurzes Projekt", description: "Kurzer Eintrag." },
    { id: "short-c", title: "Weiteres Projekt", description: "Zusammenarbeit im Team. ".repeat(3) },
  ].map(({ id, title, description }) => ({
    id,
    title,
    entries: [{ id: `${id}-entry`, zeit: "", titel: title, ort: "", beschreibung: description }],
  }));
  data.sectionOrder = ["person", "custom:tall-a", "custom:short-b", "custom:short-c"];
  data.sectionLayouts = Object.fromEntries(
    data.customSections.map(({ id }) => [
      `custom:${id}`,
      { page: targetPage, width: "half", positioning: "flow", packing: "masonry" },
    ]),
  );
  if (targetPage === 2) {
    data.hidden.referenzen = false;
    data.sectionLayouts.referenzen = {
      page: 1,
      width: "full",
      packing: "rows",
      positioning: "free",
      x: 24,
      y: 120,
      widthMm: 150,
      heightMm: 45,
    };
  }
  return data;
}

for (const targetPage of [1, 2] as const) {
  test(`Masonry measured heights: ${targetPage === 1 ? "desktop page one" : "mobile page two with free reference"}`, async ({
    page,
  }) => {
    if (targetPage === 2) await page.setViewportSize({ width: 390, height: 844 });
    const data = unevenMasonryFixture(targetPage);
    const root = await load(page, data, "classic");
    const thirdInColumn = (column: number) =>
      root.locator(
        `[data-cv-measure-page] [data-cv-masonry-column="${column}"] [data-cv-rubric="custom:short-c"]`,
      );
    await expect(thirdInColumn(2)).toHaveCount(1);
    const before = await saved(page);
    const outputs = [];
    for (const selector of [documentRoots("cv").web, documentRoots("cv").canonical]) {
      const output = await collectDocument(page, selector, "cv");
      expect(output).toHaveLength(targetPage);
      expect(output.flatMap((p) => p.issues)).toEqual([]);
      if (targetPage === 2) expect(output[0].text).toContain("Herr Thomas Weber");
      const sheet = page
        .locator(selector)
        .first()
        .locator("[data-cv-page]")
        .nth(targetPage - 1);
      for (const section of data.customSections!)
        await expect(
          sheet.locator(
            `[data-dossier-field-id="cv.entry.custom:${section.id}:${section.id}-entry.description"]`,
          ),
        ).toHaveText(section.entries[0].beschreibung.trim());
      const geometry = await sheet.evaluate((el) => {
        const columns = Array.from(el.querySelectorAll<HTMLElement>("[data-cv-masonry-column]"));
        return columns.map((column) =>
          Array.from(column.querySelectorAll<HTMLElement>("[data-cv-rubric]")).map((node) => ({
            key: node.dataset.cvRubric,
            top: node.getBoundingClientRect().top,
            bottom: node.getBoundingClientRect().bottom,
            height: node.getBoundingClientRect().height,
          })),
        );
      });
      expect(geometry.map((column) => column.map((node) => node.key))).toEqual([
        ["custom:tall-a"],
        ["custom:short-b", "custom:short-c"],
      ]);
      expect(geometry[1][1].top).toBeGreaterThanOrEqual(geometry[1][0].bottom - 0.5);
      const [a, b, c] = [geometry[0][0].height, geometry[1][0].height, geometry[1][1].height];
      const savedHeight = Math.max(a + c, b) - Math.max(a, b + c);
      expect(savedHeight).toBeGreaterThan(c - 1);
      outputs.push({ selector, output, geometry, savedHeight });
    }
    expect(await saved(page)).toEqual(before);
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const downloading = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "PDF", exact: true }).click();
    const directory = "artifacts/smart-fit-29okt";
    await mkdir(directory, { recursive: true });
    const filename = resolve(`${directory}/measured-masonry-page-${targetPage}.pdf`);
    await (await downloading).saveAs(filename);
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = getDocument({
      data: new Uint8Array(await readFile(filename)),
      disableFontFace: true,
    });
    const pdf = await task.promise;
    try {
      expect(pdf.numPages).toBe(targetPage);
      const content = await (await pdf.getPage(targetPage)).getTextContent();
      const items = content.items.filter((item) => "str" in item);
      for (const title of ["Ausführliches Projekt", "Kurzes Projekt", "Weiteres Projekt"])
        expect(items.filter((item) => item.str === title)).toHaveLength(1);
      const a = items.find((item) => item.str === "Ausführliches Projekt")!;
      const b = items.find((item) => item.str === "Kurzes Projekt")!;
      const c = items.find((item) => item.str === "Weiteres Projekt")!;
      expect(c.transform[4]).toBeGreaterThan(a.transform[4] + 50);
      expect(c.transform[4]).toBeCloseTo(b.transform[4], 0);
      expect(c.transform[5]).toBeLessThan(b.transform[5]);
    } finally {
      await task.destroy();
    }
    // A live text edit reverses the height imbalance. Re-measure the moved
    // nodes as well as the initial ones; an observer of detached nodes can
    // otherwise restore the obsolete assignment or oscillate between columns.
    const section = page.locator('[data-editor-section-title="Ausführliches Projekt"]');
    await section.locator("[data-editor-section-toggle]").click();
    await section
      .locator('input[data-dossier-field-id="cv.entry.custom:tall-a:tall-a-entry.description"]')
      .fill("Kurzer Eintrag.");
    await expect(thirdInColumn(1)).toHaveCount(1);
    await expect
      .poll(async () => (await saved(page)).data.customSections[0].entries[0].beschreibung)
      .toBe("Kurzer Eintrag.");
    const after = await saved(page);
    const expected = structuredClone(before);
    expected.data.customSections[0].entries[0].beschreibung = "Kurzer Eintrag.";
    expect(after).toEqual(expected);
    await page.reload();
    await waitEditorReady(page);
    await expect(thirdInColumn(1)).toHaveCount(1);
    await expect.poll(() => saved(page)).toEqual(after);
    await writeFile(
      `${directory}/measured-masonry-page-${targetPage}.json`,
      JSON.stringify({ before, after, outputs }, null, 2),
    );
  });
}

async function unchangedOnePage(
  page: Page,
  before: Awaited<ReturnType<typeof saved>>,
  name: string,
) {
  await autoFit(page);
  await expect.poll(() => saved(page)).toEqual(before);
  await autoFit(page);
  expect(await saved(page)).toEqual(before);
  await page.reload();
  await waitEditorReady(page);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => saved(page)).toEqual(before);
  for (const selector of [documentRoots("cv").web, documentRoots("cv").canonical]) {
    const output = await collectDocument(page, selector, "cv");
    expect(output).toHaveLength(1);
    expect(output.flatMap((p) => p.issues)).toEqual([]);
    for (const entry of before.data.erfahrung) expect(output[0].text).toContain(entry.titel);
  }
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "PDF", exact: true }).click();
  const directory = "artifacts/smart-fit-29okt";
  await mkdir(directory, { recursive: true });
  const path = resolve(`${directory}/${name}.pdf`);
  await (await downloading).saveAs(path);
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(await readFile(path)), disableFontFace: true });
  const pdf = await task.promise;
  try {
    expect(pdf.numPages).toBe(1);
    const content = await (await pdf.getPage(1)).getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    for (const entry of before.data.erfahrung) expect(text).toContain(entry.titel);
    expect(text).toContain("Herr Thomas Weber");
  } finally {
    await task.destroy();
  }
  await writeFile(
    `${directory}/${name}.json`,
    JSON.stringify({ before, after: await saved(page) }, null, 2),
  );
}

for (const layout of ["classic", "modern"]) {
  test(`smart fit ${layout}: a verified almost-full single page stays exactly unchanged`, async ({
    page,
  }) => {
    if (layout === "modern") await page.setViewportSize({ width: 390, height: 844 });
    const data = denseFixture(layout === "classic" ? 6 : 7);
    const root = await load(
      page,
      data,
      layout,
      "right",
      {},
      {
        bodyScale: layout === "classic" ? 0.92 : 0.99,
      },
    );
    await expect(root.locator("[data-cv-page]")).toHaveCount(1);
    const demand = await root.evaluate(async (root) => {
      const path = "/src/components/cv/page-fit.ts";
      return (await import(path)).measureCvOnePageDemand(root.parentElement);
    });
    expect(demand).toBeGreaterThan(0.9);
    expect(demand).toBeLessThanOrEqual(1);
    const before = await saved(page);
    await unchangedOnePage(page, before, `retained-${layout}`);
    await writeFile(
      `artifacts/smart-fit-29okt/retained-${layout}-demand.json`,
      JSON.stringify({ demand }),
    );
  });
}

test("smart fit keeps the minimally compact result of the explicit one-page action", async ({
  page,
}) => {
  const root = await load(page, denseFixture(6), "classic", "left", {}, { bodyScale: 0.93 });
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  await page.getByRole("button", { name: "Menü", exact: true }).click();
  await page.getByRole("button", { name: "Alles auf 1 Seite", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-cv-page-fit-mode="one"]')).toHaveCount(0);
  await expect(root.locator("[data-cv-page]")).toHaveCount(1);
  await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
  const before = await saved(page);
  expect(
    Object.values(before.data.sectionLayouts as NonNullable<CvData["sectionLayouts"]>).filter(
      (layout) => layout?.packing === "masonry",
    ),
  ).toHaveLength(2);
  await unchangedOnePage(page, before, "retained-minimal-pair");
});

for (const side of ["left", "right"]) {
  for (const mobile of [false, true]) {
    test(`smart fit ${side} ${mobile ? "mobile" : "desktop"}: short split Sidebar returns to one page and survives reload`, async ({
      page,
    }) => {
      if (mobile) await page.setViewportSize({ width: 390, height: 844 });
      const data = splitFixture();
      const root = await load(page, data, "modern", side);
      await expect(root.locator("[data-cv-page]")).toHaveCount(2);
      const before = await saved(page);
      await autoFit(page);
      await expect(root.locator("[data-cv-page]")).toHaveCount(1);
      await expect.poll(async () => (await saved(page)).data.sectionLayouts.sprachen.page).toBe(1);
      const after = await saved(page);
      expect(after.design).toEqual(before.design);
      expect({ ...after.data, sectionLayouts: undefined }).toEqual({
        ...before.data,
        sectionLayouts: undefined,
      });
      for (const selector of [documentRoots("cv").web, documentRoots("cv").canonical]) {
        const output = await collectDocument(page, selector, "cv");
        expect(output).toHaveLength(1);
        expect(output.flatMap((p) => p.issues)).toEqual([]);
        expect(output[0].text).toContain("Herr Thomas Weber");
        expect(output[0].text).toContain("Französisch");
        expect(output[0].text).toContain("Volleyball im Verein");
      }
      await autoFit(page);
      await expect(root.locator("[data-cv-page]")).toHaveCount(1);
      await expect.poll(() => saved(page)).toEqual(after);
      await page.reload();
      await waitEditorReady(page);
      await expect(root.locator("[data-cv-page]")).toHaveCount(1);
      expect(await saved(page)).toEqual(after);
      await expect(root.locator("[data-cv-measure-sidebar]")).toHaveCount(0);
      if (!mobile) {
        await mkdir("artifacts/smart-fit-29okt", { recursive: true });
        await root.screenshot({ path: `artifacts/smart-fit-29okt/${side}-one-page.png` });
        await page.getByRole("button", { name: "Download", exact: true }).click();
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("menuitem", { name: "PDF", exact: true }).click();
        const download = await downloadPromise;
        const path = resolve(`artifacts/smart-fit-29okt/${side}-one-page.pdf`);
        await download.saveAs(path);
        const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const task = getDocument({
          data: new Uint8Array(await readFile(path)),
          disableFontFace: true,
        });
        const pdf = await task.promise;
        try {
          expect(pdf.numPages).toBe(1);
          const content = await (await pdf.getPage(1)).getTextContent();
          const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
          expect(text.match(/Herr Thomas Weber/g)).toHaveLength(1);
          expect(text).toContain("Französisch");
          expect(text).toContain("Volleyball im Verein");
        } finally {
          await task.destroy();
        }
      }
    });
  }

  test(`smart fit ${side}: a long Sidebar is not consolidated onto one page`, async ({ page }) => {
    const data = splitFixture();
    data.sprachen = Array.from({ length: 15 }, (_, index) => ({
      id: `language-${index}`,
      name: `Sprache ${index + 1}`,
      niveau: "Gute Schulkenntnisse und schriftliche Kommunikation",
    }));
    data.hobbys = Array.from({ length: 8 }, (_, i) => `Langfristiges kreatives Hobby ${i + 1}`);
    const root = await load(page, data, "modern", side);
    await expect(root.locator("[data-cv-page]")).toHaveCount(2);
    await autoFit(page);
    await expect(root.locator("[data-cv-page]")).toHaveCount(2);
    // The measured two-column planner may keep languages on page one while
    // moving later Sidebar rubrics. Verify both rendered pages and all content.
    for (const selector of [documentRoots("cv").web, documentRoots("cv").canonical]) {
      const output = await collectDocument(page, selector, "cv");
      expect(output).toHaveLength(2);
      expect(output.flatMap((p) => p.issues)).toEqual([]);
      const text = output.map((p) => p.text).join(" ");
      for (const row of data.sprachen) expect(text).toContain(row.name);
      for (const hobby of data.hobbys) expect(text).toContain(hobby);
    }
  });

  test(`smart fit ${side}: long main text still uses two pages`, async ({ page }) => {
    const data = splitFixture();
    data.erfahrung = Array.from({ length: 8 }, (_, index) => ({
      ...data.erfahrung[0],
      id: `experience-${index}`,
      titel: `Praxiserfahrung ${index + 1}`,
      beschreibung:
        "Planung und Dokumentation, Zusammenarbeit und selbstständige Aufgaben. ".repeat(2),
    }));
    const root = await load(page, data, "modern", side);
    await expect(root.locator("[data-cv-page]")).toHaveCount(2);
    await autoFit(page);
    await expect(root.locator("[data-cv-page]")).toHaveCount(2);
    await expect.poll(async () => (await saved(page)).data.sectionLayouts.referenzen.page).toBe(2);
  });

  test(`smart fit ${side}: imported dossier still exports a native CV DOCX after fitting`, async ({
    page,
  }) => {
    page.on("dialog", (dialog) => dialog.accept());
    const input = structuredClone(approvedProject);
    input.cv.data.sectionLayouts = splitFixture().sectionLayouts!;
    input.cv.portableState.infoPosition = side === "right" ? "mirrored" : "standard";
    input.cv.portableState.mirrored = side === "right";
    await page.goto(BASE_URL);
    await expect(page.getByRole("button", { name: "Dossier laden", exact: true })).toBeVisible();
    const reloaded = page.waitForEvent("domcontentloaded", { timeout: 20_000 });
    await page.locator('input[type="file"][accept*="json"]').setInputFiles({
      name: `smart-fit-${side}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(input)),
    });
    await reloaded;
    await page.goto(`${BASE_URL}/lebenslauf`);
    await waitEditorReady(page);
    const root = page.locator(documentRoots("cv").web).first();
    await expect(root.locator("[data-cv-page]")).toHaveCount(2);
    await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
    await autoFit(page);
    await expect(root.locator("[data-cv-page]")).toHaveCount(1);
    await expect.poll(async () => (await saved(page)).data.sectionLayouts.sprachen.page).toBe(1);
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const downloading = page.waitForEvent("download", { timeout: 90_000 });
    await page.getByRole("menuitem", { name: "DOCX", exact: true }).click();
    const failure = page
      .getByRole("alert")
      .filter({ hasText: /DOCX|Word/ })
      .last();
    const outcome = await Promise.race([
      downloading.then((download) => ({ download })),
      failure
        .waitFor({ state: "visible", timeout: 90_000 })
        .then(async () => ({ error: await failure.innerText() })),
    ]);
    if ("error" in outcome) {
      const diagnostic = await page.evaluate(async () => {
        try {
          const path = "/src/lib/dossier-docx-next-export.ts";
          const result = await (await import(path)).createSavedDossierDocxNext("cv");
          return { bytes: result.blob.size, error: "" };
        } catch (error) {
          return { error: String(error), stack: error instanceof Error ? error.stack : "" };
        }
      });
      await mkdir("artifacts/smart-fit-29okt", { recursive: true });
      await writeFile(
        `artifacts/smart-fit-29okt/${side}-docx-failure.json`,
        JSON.stringify(diagnostic, null, 2),
      );
      throw new Error(`${outcome.error}: ${JSON.stringify(diagnostic)}`);
    }
    const download = outcome.download;
    const path = resolve(`artifacts/smart-fit-29okt/${side}-one-page.docx`);
    await mkdir("artifacts/smart-fit-29okt", { recursive: true });
    await download.saveAs(path);
    const entries = readZipEntries(await readFile(path));
    const stories = entries
      .filter((entry) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(entry.name))
      .map((entry) => new TextDecoder().decode(entry.bytes))
      .join("\n");
    expect(stories).toContain('name="cv.person.photo"');
    for (const expected of [
      input.cv.data.person.vorname,
      input.cv.data.person.nachname,
      ...input.cv.data.erfahrung.map((entry) => entry.titel),
      ...input.cv.data.sprachen.map((entry) => entry.name),
    ])
      expect(stories).toContain(expected);
    expect(stories).not.toContain(input.letter.data.betreff);
    expect((await saved(page)).data.person.foto).toBe(input.cv.data.person.foto);
  });
}

test("smart fit measures a custom Sidebar rubric even when it starts on page two", async ({
  page,
}) => {
  const data = splitFixture();
  data.sectionLayouts!["custom:familie"]!.page = 2;
  const root = await load(page, data, "modern", "right", {
    "lebenslauf:placement:v1": JSON.stringify({ "custom:familie": "side" }),
  });
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  await autoFit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(1);
  await expect(root.locator("[data-cv-page] [data-cv-sidebar]")).toContainText("Monika Müller");
  await expect
    .poll(async () => (await saved(page)).data.sectionLayouts["custom:familie"].page)
    .toBe(1);
});

test("smart fit measures Sidebar rubrics at the full widths its resulting layout will use", async ({
  page,
}) => {
  const data = splitFixture();
  data.sprachen = Array.from({ length: 12 }, (_, index) => ({
    id: `paired-language-${index}`,
    name: `Sprache ${index + 1}`,
    niveau: "Kenntnisse",
  }));
  data.hobbys = Array.from({ length: 14 }, (_, i) => `Kreatives Hobby ${i + 1}`);
  data.sectionLayouts!.sprachen!.width = "half";
  data.sectionLayouts!.hobbys!.width = "half";
  const root = await load(page, data);
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  await autoFit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  await expect
    .poll(async () => (await saved(page)).data.sectionLayouts.sprachen.width)
    .toBe("full");
});

test("smart fit respects reduced first-page capacity from saved page margins", async ({ page }) => {
  const data = splitFixture();
  data.erfahrung = Array.from({ length: 6 }, (_, index) => ({
    ...data.erfahrung[0],
    id: `margin-experience-${index}`,
  }));
  const root = await load(page, data, "modern", "left", {
    "bewerbungsdossier:page-margins:v1": JSON.stringify({
      cv: { top: 80, bottom: 80, left: 20, right: 20 },
    }),
  });
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  const before = await page.evaluate(() =>
    localStorage.getItem("bewerbungsdossier:page-margins:v1"),
  );
  await autoFit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  expect(await page.evaluate(() => localStorage.getItem("bewerbungsdossier:page-margins:v1"))).toBe(
    before,
  );
});

test("smart fit includes the automatic portrait in Sidebar capacity and preserves its bytes", async ({
  page,
}) => {
  const data = splitFixture();
  data.person.foto =
    "data:image/svg+xml;base64," +
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="100"><rect width="80" height="100" fill="#326078"/><circle cx="40" cy="40" r="20" fill="#d0b080"/></svg>',
    ).toString("base64");
  const root = await load(page, data, "modern", "right");
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  await autoFit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(1);
  await expect(root.locator("[data-cv-page] [data-cv-sidebar] [data-cv-photo] img")).toBeVisible();
  await expect.poll(async () => (await saved(page)).data.person.foto).toBe(data.person.foto);
});

test("smart fit keeps an explicitly positioned second-page rubric and its coordinates", async ({
  page,
}) => {
  const data = splitFixture();
  data.sectionLayouts!.referenzen = {
    page: 2,
    width: "full",
    packing: "rows",
    positioning: "free",
    x: 24,
    y: 90,
    widthMm: 100,
    heightMm: 45,
  };
  const root = await load(page, data);
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  const before = (await saved(page)).data.sectionLayouts.referenzen;
  await autoFit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  await expect.poll(async () => (await saved(page)).data.sectionLayouts.referenzen).toEqual(before);
});

test("smart fit still consolidates a short standard CV without changing content or typography", async ({
  page,
}) => {
  const root = await load(page, splitFixture(), "classic");
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  const before = await saved(page);
  await autoFit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(1);
  await expect.poll(async () => (await saved(page)).data.sectionLayouts.sprachen.page).toBe(1);
  expect((await saved(page)).design).toEqual(before.design);
});

function compactClassicFixture(packing: "rows" | "masonry" = "masonry") {
  const data = splitFixture();
  for (const key of ["sprachen", "hobbys", "staerken"] as const)
    data.sectionLayouts![key] = { page: 2, width: "half", packing, positioning: "flow" };
  return data;
}

for (const packing of ["rows", "masonry"] as const) {
  for (const mobile of [false, true]) {
    test(`smart fit compact classic ${packing} ${mobile ? "mobile" : "desktop"}: complete flow returns to one page without repacking`, async ({
      page,
    }) => {
      if (mobile) await page.setViewportSize({ width: 390, height: 844 });
      const root = await load(page, compactClassicFixture(packing), "classic");
      await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
      await expect(root.locator("[data-cv-page]")).toHaveCount(2);
      const before = await saved(page);
      await autoFit(page);
      await expect(root.locator("[data-cv-page]")).toHaveCount(1);
      const after = await saved(page);
      expect(after.design).toEqual(before.design);
      expect({ ...after.data, sectionLayouts: undefined }).toEqual({
        ...before.data,
        sectionLayouts: undefined,
      });
      for (const key of cvSectionOrder(before.data)) {
        expect(after.data.sectionLayouts[key].page).toBe(1);
        expect(after.data.sectionLayouts[key].width).toBe(before.data.sectionLayouts[key].width);
        expect(after.data.sectionLayouts[key].packing).toBe(
          before.data.sectionLayouts[key].packing,
        );
      }
      for (const selector of [documentRoots("cv").web, documentRoots("cv").canonical]) {
        const output = await collectDocument(page, selector, "cv");
        expect(output).toHaveLength(1);
        expect(output.flatMap((p) => p.issues)).toEqual([]);
        for (const text of ["Französisch", "Volleyball im Verein", "Herr Thomas Weber"])
          expect(output[0].text).toContain(text);
      }
      await autoFit(page);
      await expect.poll(() => saved(page)).toEqual(after);
      await page.reload();
      await waitEditorReady(page);
      await expect(root.locator("[data-cv-page]")).toHaveCount(1);
      await expect.poll(() => saved(page)).toEqual(after);
      if (!mobile) {
        await page.getByRole("button", { name: "Download", exact: true }).click();
        const downloading = page.waitForEvent("download");
        await page.getByRole("menuitem", { name: "PDF", exact: true }).click();
        const download = await downloading;
        const filename = resolve(`artifacts/smart-fit-29okt/compact-classic-${packing}.pdf`);
        await mkdir("artifacts/smart-fit-29okt", { recursive: true });
        await download.saveAs(filename);
        const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const task = getDocument({
          data: new Uint8Array(await readFile(filename)),
          disableFontFace: true,
        });
        const pdf = await task.promise;
        try {
          expect(pdf.numPages).toBe(1);
          const content = await (await pdf.getPage(1)).getTextContent();
          const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
          expect(text).toContain("Französisch");
          expect(text).toContain("Volleyball im Verein");
          expect(text.match(/Herr Thomas Weber/g)).toHaveLength(1);
        } finally {
          await task.destroy();
        }
      }
    });
  }
}

test("smart fit long compact classic content stays on two pages without shrinking", async ({
  page,
}) => {
  const data = compactClassicFixture();
  data.hobbys = Array.from(
    { length: 15 },
    (_, index) =>
      `Vereinsprojekt ${index + 1}: Gemeinsam einen grösseren Anlass sorgfältig planen und umsetzen`,
  );
  const root = await load(page, data, "classic");
  await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
  const before = await saved(page);
  await autoFit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  expect((await saved(page)).design).toEqual(before.design);
  expect((await saved(page)).data.hobbys).toEqual(before.data.hobbys);
  for (const selector of [documentRoots("cv").web, documentRoots("cv").canonical]) {
    const output = await collectDocument(page, selector, "cv");
    expect(output).toHaveLength(2);
    expect(output.flatMap((p) => p.issues)).toEqual([]);
    for (const text of data.hobbys) expect(output.map((p) => p.text).join(" ")).toContain(text);
  }
});

test("smart fit compact classic keeps a freely placed second-page reference", async ({ page }) => {
  const data = compactClassicFixture();
  data.sectionLayouts!.referenzen = {
    page: 2,
    width: "full",
    packing: "rows",
    positioning: "free",
    x: 24,
    y: 68,
    widthMm: 150,
    heightMm: 45,
  };
  const root = await load(page, data, "classic");
  await expect(page.locator('[role="status"][title="Automatisch gespeichert"]')).toBeVisible();
  const before = await saved(page);
  await autoFit(page);
  await expect(root.locator("[data-cv-page]")).toHaveCount(2);
  expect((await saved(page)).data.sectionLayouts.referenzen).toEqual(
    before.data.sectionLayouts.referenzen,
  );
  expect((await saved(page)).design).toEqual(before.design);
});
