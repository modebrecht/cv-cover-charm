import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { parityStorage, SELECTION_TARGETS } from "./support/cv-parity-fixture";
import { pdfSelectionBoxes } from "./support/pdf-selection-boxes";
const BASE = "http://127.0.0.1:4173";

async function seed(page: Page, storage: Record<string, string>) {
  await page.addInitScript((values) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, storage);
}
async function hostileRoot(page: Page) {
  await page.evaluate(() => {
    const root = document.documentElement;
    for (const key of Object.keys(root.dataset))
      if (key.startsWith("cv") || key.startsWith("dossier")) delete root.dataset[key];
    root.dataset.dossierTemplate = "brief";
    root.dataset.cvVariant = "editorial";
    root.dataset.cvMirrored = "true";
    root.dataset.cvInfoPosition = "mirrored";
    root.dataset.cvPhotoShape = "rect";
    for (const property of Array.from(root.style))
      if (property.startsWith("--dossier-") || property.startsWith("--cv-"))
        root.style.removeProperty(property);
    root.style.setProperty("--cv-photo-width", "300%");
    root.style.setProperty("--cv-doc-title-margin-top", "99px");
  });
}
async function settled(page: Page, cv: Locator) {
  await expect(cv.locator('[data-cv-page="0"] [data-cv-entry-title]').first()).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  const boxes = await cv.evaluate((root) => {
    const read = (selector: string) => {
      const style = getComputedStyle(root.querySelector(selector)!);
      return [style.left, style.right, style.top, style.bottom, style.width, style.height];
    };
    return [
      read("[data-cv-measure-page] > [data-cv-main]"),
      read('[data-cv-page="0"] > [data-cv-main]'),
    ];
  });
  expect(boxes[0], "measurement uses the actual first-page rail and content box").toEqual(boxes[1]);
}
async function geometry(cv: Locator) {
  return cv.locator("[data-cv-page]").evaluateAll((pages) =>
    pages.map((page) => {
      const sheet = page.getBoundingClientRect();
      const round = (n: number) => Math.round(n * 100) / 100;
      const nodes = Array.from(
        page.querySelectorAll<HTMLElement>(
          "[data-cv-main], [data-cv-header], [data-cv-section], [data-cv-section-title], [data-cv-entry-title], [data-cv-body], [data-cv-sidebar], [data-cv-photo]",
        ),
      );
      return {
        text: page.textContent,
        nodes: nodes.map((node) => {
          const rect = node.getBoundingClientRect(),
            s = getComputedStyle(node);
          return {
            text: node.hasAttribute("data-cv-main") ? null : node.textContent,
            box: [
              round(((rect.left - sheet.left) / sheet.width) * 210),
              round(((rect.top - sheet.top) / sheet.height) * 297),
              round((rect.width / sheet.width) * 210),
              round((rect.height / sheet.height) * 297),
            ],
            font: [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing],
            photo: s.borderRadius,
          };
        }),
      };
    }),
  );
}
async function ranges(cvPage: Locator, targets: string[]) {
  return cvPage.evaluate((page, items) => {
    const sheet = page.getBoundingClientRect(),
      result: Record<string, { left: number; top: number; width: number; height: number }> = {};
    for (const target of items) {
      const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const start = (node.nodeValue ?? "").indexOf(target);
        if (start < 0) continue;
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, start + target.length);
        const r = range.getBoundingClientRect();
        result[target] = {
          left: (r.left - sheet.left) / sheet.width,
          top: (r.top - sheet.top) / sheet.height,
          width: r.width / sheet.width,
          height: r.height / sheet.height,
        };
        break;
      }
    }
    return result;
  }, targets);
}
async function openCombined(page: Page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await expect(page.locator('[data-dossier-document="cv"]')).toHaveCount(0);
  await hostileRoot(page);
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(dialog.getByRole("button", { name: "PDF herunterladen", exact: true })).toBeEnabled({
    timeout: 30_000,
  });
  return {
    cv: page.locator('[data-dossier-document="cv"][data-export-mode="true"]').first(),
    dialog,
  };
}
async function textPages(path: string) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loading = getDocument({
    data: new Uint8Array(await readFile(path)),
    disableFontFace: true,
  });
  const doc = await loading.promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const c = await (await doc.getPage(i)).getTextContent();
      pages.push(c.items.map((x) => ("str" in x ? x.str : "")).join(" "));
    }
    return pages;
  } finally {
    await loading.destroy();
  }
}

for (const template of [
  "studio3",
  "studio2",
  "ledger",
  "ribbon",
  "gallery",
  "prism",
  "neon",
  "citrus",
]) {
  test(`cold combined dossier matches visible and standalone CV; PDF selection follows raster: ${template}`, async ({
    page,
    browser,
  }) => {
    test.setTimeout(150_000);
    const storage = parityStorage(template);
    await seed(page, storage);
    const { cv, dialog } = await openCombined(page);
    await expect(cv).toHaveAttribute("data-cv-template", template);
    await settled(page, cv);
    const canonical = await geometry(cv);
    const expectedBoxes = await ranges(cv.locator('[data-cv-page="0"]'), SELECTION_TARGETS);
    for (const target of SELECTION_TARGETS) expect(expectedBoxes[target], target).toBeTruthy();
    const context = await browser.newContext();
    try {
      const preview = await context.newPage();
      await seed(preview, storage);
      await preview.goto(`${BASE}/lebenslauf`, { waitUntil: "networkidle" });
      const visible = preview
        .locator('[data-dossier-document="cv"][data-export-mode="false"]')
        .first();
      const standalone = preview
        .locator('[data-dossier-document="cv"][data-export-mode="true"]')
        .first();
      await settled(preview, visible);
      expect(await geometry(visible)).toEqual(canonical);
      expect(await geometry(standalone)).toEqual(canonical);
      await hostileRoot(preview);
      expect(await geometry(visible)).toEqual(canonical);
    } finally {
      await context.close();
    }
    const promise = page.waitForEvent("download", { timeout: 120_000 });
    await dialog.getByRole("button", { name: "PDF herunterladen", exact: true }).click();
    const path = await (await promise).path();
    expect(path).toBeTruthy();
    const pdfPages = await textPages(path!);
    expect(pdfPages.length - 2).toBe(canonical.length);
    const boxes = await pdfSelectionBoxes(path!, 3, SELECTION_TARGETS);
    for (const target of SELECTION_TARGETS) {
      const actual = boxes[target],
        expected = expectedBoxes[target];
      expect(actual, target).toBeTruthy();
      expect(
        Math.abs(actual.left / actual.pageWidth - expected.left),
        `${target} x`,
      ).toBeLessThanOrEqual(1.5 / 210);
      expect(
        Math.abs(actual.top / actual.pageHeight - expected.top),
        `${target} y`,
      ).toBeLessThanOrEqual(1.5 / 297);
      expect(
        Math.abs(actual.width / actual.pageWidth - expected.width),
        `${target} width`,
      ).toBeLessThanOrEqual(2 / 210);
      expect(
        Math.abs(actual.height / actual.pageHeight - expected.height),
        `${target} height`,
      ).toBeLessThanOrEqual(2 / 297);
    }
  });
}

for (const sidebar of [false, true]) {
  test(`long CV preserves page and marker distribution in preview, standalone and combined PDF; sidebar=${sidebar}`, async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
    const storage = parityStorage("gallery", true, sidebar);
    await seed(page, storage);
    const { cv, dialog } = await openCombined(page);
    await settled(page, cv);
    const canonical = await geometry(cv);
    expect(canonical.length).toBeGreaterThan(1);
    const targets = [
      "Sekundarschule, Niveau A",
      ...Array.from({ length: 18 }, (_, i) => `Praxisstation ${String(i + 1).padStart(2, "0")}`),
      "Referenzmarker",
    ];
    const distribution = (pages: string[]) =>
      targets.map((target) => ({
        target,
        pages: pages.flatMap((text, i) => (text.includes(target) ? [i] : [])),
      }));
    const domDistribution = distribution(canonical.map((p) => p.text ?? ""));
    for (const item of domDistribution)
      expect(item.pages, `${item.target} present exactly once`).toHaveLength(1);
    expect(domDistribution[0].pages).toEqual([0]);
    expect(domDistribution.some((item) => item.pages[0] > 0)).toBe(true);
    const context = await browser.newContext();
    let standaloneText: string[];
    try {
      const preview = await context.newPage();
      await seed(preview, storage);
      await preview.goto(`${BASE}/lebenslauf`, { waitUntil: "networkidle" });
      const visible = preview
        .locator('[data-dossier-document="cv"][data-export-mode="false"]')
        .first();
      await settled(preview, visible);
      expect(await geometry(visible)).toEqual(canonical);
      expect(
        await geometry(
          preview.locator('[data-dossier-document="cv"][data-export-mode="true"]').first(),
        ),
      ).toEqual(canonical);
      await preview.getByRole("button", { name: "Download", exact: true }).click();
      const promise = preview.waitForEvent("download", { timeout: 120_000 });
      await preview.getByRole("button", { name: /Nur Lebenslauf als PDF/ }).click();
      const path = await (await promise).path();
      standaloneText = await textPages(path!);
    } finally {
      await context.close();
    }
    const promise = page.waitForEvent("download", { timeout: 120_000 });
    await dialog.getByRole("button", { name: "PDF herunterladen", exact: true }).click();
    const path = await (await promise).path();
    const combined = (await textPages(path!)).slice(2);
    expect(combined).toHaveLength(canonical.length);
    expect(standaloneText!).toHaveLength(canonical.length);
    expect(distribution(combined)).toEqual(domDistribution);
    expect(distribution(standaloneText!)).toEqual(domDistribution);
    for (const target of targets) expect(combined.join(" ").split(target)).toHaveLength(2);
  });
}
