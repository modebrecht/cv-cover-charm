import { expect, test, type Page } from "@playwright/test";
import { DEMO_CV, cvSectionOrder, type CvData } from "../../src/components/cv/types";
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
) {
  await page.goto(`${BASE_URL}/fonts/Cabin-OFL.txt`);
  await page.evaluate(
    ({ data, layout, side, extraStorage }) => {
      localStorage.clear();
      localStorage.setItem(
        "lebenslauf:v1",
        JSON.stringify({
          version: 2,
          data,
          design: { template: "modern", colors: {}, bgOpacity: 0.06, useElements: false },
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
    { data, layout, side, extraStorage },
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
    await expect.poll(async () => (await saved(page)).data.sectionLayouts.sprachen.page).toBe(2);
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
