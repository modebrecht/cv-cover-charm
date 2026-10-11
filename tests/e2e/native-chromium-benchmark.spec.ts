/** Opt-in QA only. Uses the product buttons, renderer, readiness and print CSS. */
import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cpus, platform, release, totalmem } from "node:os";
import {
  BASE_URL,
  GALLERY_CASES,
  applyGalleryCase,
  assertCanonicalDossier,
  assertGalleryCatalog,
  galleryBaseName,
  seedCanonicalDossier,
  waitEditorReady,
} from "./support/dossier-gallery-shared";
import { parityStorage } from "./support/cv-parity-fixture";

const OUTPUT = process.env.NATIVE_PRINT_BENCHMARK_DIR;
const PHYSICAL =
  '[data-dossier-document="cover"], [data-letter-document-pages] [data-letter-page], [data-cv-page]';
const NODES =
  "[data-cv-main], [data-cv-header], [data-cv-section], [data-cv-entry-title], [data-cv-photo], [data-cv-sidebar], [data-cv-doc-title], [data-cv-section-title], [data-cv-name]";
const PDF_OPTIONS = {
  format: "A4" as const,
  landscape: false,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false,
  scale: 1,
};
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

async function geometry(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((sheet, nodes) => {
      const p = sheet.getBoundingClientRect();
      return {
        page: [p.width, p.height],
        text: sheet.textContent,
        nodes: Array.from(sheet.querySelectorAll<HTMLElement>(nodes)).map((node) => {
          const r = node.getBoundingClientRect(),
            s = getComputedStyle(node);
          return {
            tag: node.outerHTML.split(">")[0].replace(/style="[^"]*"/g, ""),
            text: node.textContent,
            box: [
              ((r.x - p.x) / p.width) * 210,
              ((r.y - p.y) / p.height) * 297,
              (r.width / p.width) * 210,
              (r.height / p.height) * 297,
            ],
            font: [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing],
          };
        }),
      };
    }, NODES);
}

async function settle(page: Page, selector: string) {
  await expect(page.locator(selector).first()).toBeVisible();
  await page.evaluate(async (selector) => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.querySelector(selector)!.querySelectorAll("img"), async (image) => {
        await image.decode();
        if (!image.naturalWidth) throw new Error("Broken fixture image");
      }),
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }, selector);
}

async function openDossier(page: Page) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(dialog.getByRole("button", { name: "PDF herunterladen", exact: true })).toBeEnabled({
    timeout: 30000,
  });
  await page.evaluate(async () => {
    const { prepareDossierNativePrint } = await import(String("/src/lib/dossier-native-print.ts"));
    const prepared = await prepareDossierNativePrint(
      document.querySelector("[data-dossier-pdf-canvas]")!,
    );
    prepared.release();
  });
  return dialog;
}

async function canonical(page: Page) {
  return page
    .locator("[data-dossier-pdf-canvas]")
    .locator(PHYSICAL)
    .evaluateAll((pages) =>
      pages.map((sheet) => ({
        kind: sheet.hasAttribute("data-cv-page")
          ? "cv"
          : sheet.hasAttribute("data-letter-page")
            ? "letter"
            : "cover",
        text: sheet.textContent ?? "",
      })),
    );
}

async function pdfInfo(bytes: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
  const pdf = await task.promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i),
      content = await page.getTextContent(),
      box = page.getViewport({ scale: 1 });
    pages.push({
      text: content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
      width: box.width,
      height: box.height,
    });
  }
  await task.destroy();
  return pages;
}

async function capturePdfPaths(page: Page, base: string, sourceSha: string, fixtureHash: string) {
  let dialog = await openDossier(page);
  const before = await canonical(page);
  const screenGeometry = await geometry(page, '[data-dossier-pdf-canvas] [data-cv-page="0"]');
  const currentStart = performance.now();
  const downloadPromise = page.waitForEvent("download", { timeout: 120000 });
  await dialog.getByRole("button", { name: "PDF herunterladen", exact: true }).click();
  const download = await downloadPromise;
  const currentBytes = await readFile((await download.path())!);
  const currentMs = performance.now() - currentStart;
  await writeFile(join(OUTPUT!, `${base}--current.pdf`), currentBytes);

  dialog = await openDossier(page);
  expect(await canonical(page)).toEqual(before);
  await page.evaluate(() => {
    window.print = () => window.dispatchEvent(new Event("beforeprint"));
  });
  const nativeStart = performance.now();
  await dialog.getByRole("button", { name: "Drucken / als PDF speichern", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-dossier-native-print", "true");
  await page.emulateMedia({ media: "print" });
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("body > [data-dossier-native-print-root]")).toBeVisible();
  const printGeometry = await geometry(page, '[data-dossier-pdf-canvas] [data-cv-page="0"]');
  expect(await canonical(page)).toEqual(before);
  const nativeBytes = await page.pdf(PDF_OPTIONS);
  const nativeMs = performance.now() - nativeStart;
  await writeFile(join(OUTPUT!, `${base}--native.pdf`), nativeBytes);
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  const currentPages = await pdfInfo(currentBytes),
    nativePages = await pdfInfo(nativeBytes);
  expect(currentPages).toHaveLength(before.length);
  expect(nativePages).toHaveLength(before.length);
  for (const sheet of nativePages) {
    expect(sheet.width).toBeCloseTo((210 * 72) / 25.4, 0);
    expect(sheet.height).toBeCloseTo((297 * 72) / 25.4, 0);
    expect(sheet.text.trim()).not.toBe("");
    expect(sheet.text).not.toMatch(/Dossier herunterladen|Projekt speichern/);
  }
  return {
    sourceSha,
    fixtureHash,
    canonical: before,
    screenGeometry,
    printGeometry,
    current: {
      sourceSha,
      fixtureHash,
      sha256: hash(currentBytes),
      bytes: currentBytes.length,
      ms: currentMs,
      pages: currentPages,
    },
    native: {
      sourceSha,
      fixtureHash,
      sha256: hash(nativeBytes),
      bytes: nativeBytes.length,
      ms: nativeMs,
      pages: nativePages,
    },
  };
}

test("same-source 39-template native Chromium benchmark", async ({ page, browser }) => {
  test.skip(
    !OUTPUT,
    "Opt-in: set NATIVE_PRINT_BENCHMARK_DIR; ordinary CI runs product regressions.",
  );
  test.setTimeout(45 * 60000);
  await mkdir(OUTPUT!, { recursive: true });
  const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const sourceTree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim();
  assertGalleryCatalog();
  const stored = await seedCanonicalDossier(page);
  assertCanonicalDossier(stored);
  const rows = [];
  const pilot = process.env.NATIVE_PRINT_BENCHMARK_PILOT === "1";
  if (!pilot)
    execFileSync("git", ["diff", "--exit-code", "HEAD", "--", "src"], { encoding: "utf8" });
  for (const [index, item] of GALLERY_CASES.entries()) {
    if (pilot && !["neon", "gallery"].includes(item.id)) continue;
    await applyGalleryCase(page, stored, item);
    const storage = await page.evaluate(() =>
      Object.fromEntries(
        Object.keys(localStorage)
          .sort()
          .map((key) => [key, localStorage.getItem(key)!]),
      ),
    );
    const fixtureHash = hash(JSON.stringify(storage)),
      base = galleryBaseName(index, item.label);
    const context = await browser.newContext({
      viewport: { width: 1800, height: 1600 },
      deviceScaleFactor: 1,
    });
    await context.addInitScript((values) => {
      localStorage.clear();
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
    }, storage);
    const capture = await context.newPage();
    const web: Record<string, unknown> = {};
    let liveGeometry;
    for (const [kind, route, selector] of [
      ["cover", "/titelblatt", 'main [data-dossier-document="cover"]'],
      ["letter", "/anschreiben", "main [data-letter-page]"],
      ["cv", "/lebenslauf", '[data-dossier-document="cv"][data-export-mode="false"]'],
    ]) {
      await capture.goto(BASE_URL + route, { waitUntil: "networkidle" });
      await waitEditorReady(capture);
      await settle(capture, selector);
      if (kind === "cv") liveGeometry = await geometry(capture, `${selector} [data-cv-page="0"]`);
      const bytes = await capture
        .locator(selector)
        .first()
        .screenshot({ animations: "disabled", caret: "hide" });
      await writeFile(join(OUTPUT!, `${base}--web-${kind}.png`), bytes);
      web[kind] = { sourceSha, fixtureHash, sha256: hash(bytes) };
    }
    const paths = await capturePdfPaths(capture, base, sourceSha, fixtureHash);
    const row = { id: item.id, template: item.label, base, web, liveGeometry, ...paths };
    await writeFile(join(OUTPUT!, `${base}.json`), JSON.stringify(row, null, 2));
    rows.push(row);
    await context.close();
    console.log(
      `BENCHMARK ${index + 1}/39 ${item.label}: current ${paths.current.ms.toFixed(0)}ms, native ${paths.native.ms.toFixed(0)}ms`,
    );
  }
  const longs = [];
  if (!pilot)
    for (const sidebar of [false, true]) {
      const storage = parityStorage(sidebar ? "gallery" : "studio3", true, sidebar);
      const letter = JSON.parse(storage["anschreiben:v1"]);
      letter.data.text = Array.from(
        { length: 14 },
        (_, i) =>
          `Briefmarker${String(i + 1).padStart(2, "0")}: Ich interessiere mich sehr für diesen Beruf und möchte meine Motivation, Zuverlässigkeit und Lernbereitschaft mit einem ausführlichen Beispiel aus Schule und Alltag zeigen.`,
      ).join("\n\n");
      letter.data.richTextHtml = "";
      storage["anschreiben:v1"] = JSON.stringify(letter);
      const context = await browser.newContext();
      await context.addInitScript((values) => {
        localStorage.clear();
        for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
      }, storage);
      const capture = await context.newPage(),
        base = sidebar ? "long-gallery-sidebar" : "long-studio3-classic";
      const row = await capturePdfPaths(capture, base, sourceSha, hash(JSON.stringify(storage)));
      expect(row.canonical.filter((p) => p.kind === "letter")).toHaveLength(2);
      expect(row.canonical.filter((p) => p.kind === "cv").length).toBeGreaterThanOrEqual(2);
      for (const marker of [
        ...Array.from({ length: 14 }, (_, i) => `Briefmarker${String(i + 1).padStart(2, "0")}`),
        ...Array.from({ length: 18 }, (_, i) => `Praxisstation ${String(i + 1).padStart(2, "0")}`),
        "Referenzmarker",
      ]) {
        const expected = row.canonical.flatMap((p, i) => (p.text.includes(marker) ? [i] : []));
        expect(expected, marker).toHaveLength(1);
        for (const path of [row.current, row.native])
          expect(
            path.pages.flatMap((p, i) => (p.text.includes(marker) ? [i] : [])),
            marker,
          ).toEqual(expected);
      }
      longs.push({ base, ...row });
      await context.close();
    }
  expect(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()).toBe(sourceSha);
  const browserSession = await browser.newBrowserCDPSession();
  const { arguments: browserCommandLine } = await browserSession.send(
    "Browser.getBrowserCommandLine",
  );
  await browserSession.detach();
  await writeFile(
    join(OUTPUT!, "manifest.json"),
    JSON.stringify(
      {
        sourceSha,
        sourceTree,
        pilot,
        browser: browser.version(),
        browserCommandLine,
        environment: {
          node: process.version,
          platform: platform(),
          release: release(),
          cpu: cpus()[0]?.model,
          logicalCpus: cpus().length,
          memoryBytes: totalmem(),
        },
        playwright: JSON.parse(
          execFileSync(
            "node",
            ["-p", "JSON.stringify(require('@playwright/test/package.json').version)"],
            { encoding: "utf8" },
          ),
        ),
        pdfOptions: PDF_OPTIONS,
        viewport: [1800, 1600],
        deviceScaleFactor: 1,
        rows,
        longs,
      },
      null,
      2,
    ),
  );
});
