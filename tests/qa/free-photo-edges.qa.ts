import { expect, test, type Locator } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { BASE_URL } from "../e2e/support/dossier-gallery-shared";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  DOSSIER_CHROME_STORAGE_KEY,
} from "../../src/lib/dossier-chrome";
import { paginationFixture } from "./pagination-fixtures";
import {
  collectDocument,
  documentRoots,
  loadFixture,
  runtimeProvenance,
} from "./pagination-browser";
import { contentFindings, distributionFindings, normalizeContent } from "./pagination-assertions";

const out = "artifacts/free-photo-edges";
const cases = [
  { name: "left-square", x: 0, y: 259, shape: "square", edge: "left" },
  { name: "right-portrait", x: 186, y: 230, shape: "portrait", edge: "right" },
  { name: "top-circle", x: 180, y: 0, shape: "circle", edge: "top" },
  {
    name: "bottom-portrait-mirrored",
    x: 150,
    y: 267,
    shape: "portrait",
    edge: "bottom",
    mirrored: true,
  },
  { name: "left-square-mirrored", x: 186, y: 230, shape: "square", edge: "left", mirrored: true },
  { name: "outside-right", x: 195, y: 230, shape: "portrait", blocked: true },
  { name: "overlap-date-left", x: 0, y: 230, shape: "square", blocked: true },
  { name: "outside-bottom", x: 150, y: 282, shape: "portrait", blocked: true },
  { name: "outside-left-mirrored", x: 195, y: 230, shape: "square", mirrored: true, blocked: true },
] as const;

async function photoBox(sheet: Locator) {
  return sheet.evaluate((sheet) => {
    const page = sheet.getBoundingClientRect();
    const photo = sheet.querySelector("[data-cv-photo-free]")!.getBoundingClientRect();
    return [
      ((photo.x - page.x) * 210) / page.width,
      ((photo.y - page.y) * 297) / page.height,
      (photo.width * 210) / page.width,
      (photo.height * 297) / page.height,
    ];
  });
}

for (const item of cases) {
  test(`free CV photo page boundary: ${item.name}`, async ({ page }) => {
    test.setTimeout(120_000);
    await mkdir(out, { recursive: true });
    const mirrored = "mirrored" in item && item.mirrored;
    const blocked = "blocked" in item && item.blocked;
    const fixture = paginationFixture("brief", {
      works: 1,
      schools: 1,
      paragraphs: 2,
      layout: mirrored ? "modern" : "classic",
      mirrored,
    });
    const chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
    for (const scope of ["shared", "cv", "letter"] as const) {
      chrome[scope].headerMode = "none";
      chrome[scope].headerContinuationMode = "none";
      chrome[scope].footerMode = "none";
    }
    fixture.storage[DOSSIER_CHROME_STORAGE_KEY] = JSON.stringify(chrome);
    const letter = JSON.parse(fixture.storage["anschreiben:v1"]);
    letter.design.headerMode = "none";
    letter.design.footerMode = "none";
    fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
    await page.goto(`${BASE_URL}/fonts/Cabin-OFL.txt`);
    const image = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 200;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#c94838";
      context.fillRect(0, 0, 160, 200);
      context.fillStyle = "#246baf";
      context.fillRect(80, 0, 80, 200);
      context.fillStyle = "#e5c551";
      context.fillRect(0, 140, 160, 60);
      context.fillStyle = "#172c39";
      context.beginPath();
      context.arc(47, 62, 26, 0, 2 * Math.PI);
      context.fill();
      return canvas.toDataURL();
    });
    const cv = JSON.parse(fixture.storage["lebenslauf:v1"]);
    cv.data.person.foto = image;
    fixture.storage["lebenslauf:v1"] = JSON.stringify(cv);
    fixture.storage["lebenslauf:photo:v2"] = JSON.stringify({
      shape: item.shape,
      zoom: 1.65,
      x: 85,
      y: 20,
      borderWidth: 1.2,
    });
    fixture.storage["lebenslauf:photo-place:v1"] = JSON.stringify({
      mode: "frei",
      xMm: item.x,
      yMm: item.y,
      widthMm: 24,
      frameColor: "#0b7362",
    });
    await loadFixture(page, fixture, "cv");
    const webRoot = page.locator(documentRoots("cv").web);
    await expect(webRoot).toHaveAttribute("data-cv-mirrored", String(mirrored));
    await expect(webRoot.locator("[data-cv-photo-free] img")).toHaveCount(1);
    const web = await collectDocument(page, documentRoots("cv").web, "cv");
    const webBox = await photoBox(webRoot.locator('[data-cv-page="0"]'));
    const photoRendering = await webRoot.locator("[data-cv-photo-free]").evaluate((photo) => ({
      filter: getComputedStyle(photo.querySelector("img")!).filter,
      frameColor: getComputedStyle(photo, "::after").borderTopColor,
      frameWidth: getComputedStyle(photo, "::after").borderTopWidth,
    }));
    expect(photoRendering.frameColor).toBe("rgb(11, 115, 98)");
    const expectedX = mirrored ? 210 - item.x - 24 : item.x;
    expect(Math.abs(webBox[0] - expectedX)).toBeLessThanOrEqual(0.3);
    expect(Math.abs(webBox[1] - item.y)).toBeLessThanOrEqual(0.3);
    await webRoot.locator('[data-cv-page="0"]').screenshot({
      path: join(out, `${item.name}--cv-web.png`),
      animations: "disabled",
      // Editor-only resize handles are not printed; all photo/frame pixels remain.
      style: "[data-cv-photo-handle]{visibility:hidden!important}",
    });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const root = page.locator("[data-dossier-pdf-canvas]");
    const cvRoot = root.locator('[data-dossier-document="cv"]');
    await expect(root).toHaveAttribute("data-dossier-cv-ready", "true");
    await expect(cvRoot.locator("[data-cv-photo-free] img")).toHaveCount(1);
    const canonicalBox = await photoBox(cvRoot.locator('[data-cv-page="0"]'));
    const canonicalRendering = await cvRoot.locator("[data-cv-photo-free]").evaluate((photo) => ({
      filter: getComputedStyle(photo.querySelector("img")!).filter,
      frameColor: getComputedStyle(photo, "::after").borderTopColor,
      frameWidth: getComputedStyle(photo, "::after").borderTopWidth,
    }));
    expect(canonicalRendering).toEqual(photoRendering);
    for (const [axis, value] of canonicalBox.entries())
      expect(Math.abs(value - webBox[axis])).toBeLessThanOrEqual(0.3);
    const inspect = () =>
      root.evaluate(async (root) => {
        const path = "/src/lib/pdf-preflight.ts";
        const result = (await import(path)).inspectPdfPreflight(root as HTMLElement, "dossier");
        return { status: result.status, issues: result.issues };
      });
    const button = page
      .getByRole("dialog")
      .getByRole("button", { name: "PDF herunterladen", exact: true });
    try {
      await expect
        .poll(async () => (await inspect()).status, { timeout: 30_000 })
        .toBe(blocked ? "blocked" : "pass");
    } catch (error) {
      await writeFile(
        join(out, `${item.name}-failure.json`),
        JSON.stringify(
          {
            item,
            webBox,
            canonicalBox,
            verdict: await inspect(),
            storage: fixture.storage,
          },
          null,
          2,
        ),
      );
      throw error;
    }
    const verdict = await inspect();
    const downloads: string[] = [];
    page.on("download", (file) => downloads.push(file.suggestedFilename()));
    let pdf: { sha256: string; pages: number; cvPageIndex: number } | null = null;
    let directFailure: string | null = null;
    if (blocked) {
      expect(
        verdict.issues.some(
          (issue: { code: string; documentKind: string }) =>
            issue.code === "physical-overflow" && issue.documentKind === "cv",
        ),
      ).toBe(true);
      await expect(button).toBeDisabled();
      await expect(
        page.getByRole("button", { name: "PDF trotzdem herunterladen", exact: true }),
      ).toHaveCount(0);
      const before = await page.evaluate(() => localStorage.getItem("lebenslauf:photo-place:v1"));
      directFailure = await root.evaluate(async (root) => {
        const path = "/src/lib/dossier-pdf.ts";
        try {
          await (
            await import(path)
          ).downloadCombinedDossierPdf(root as HTMLElement, "must-not-download.pdf", {
            title: "QA",
            author: "QA",
          });
          return "UNSAFE SUCCESS";
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
      });
      expect(directFailure).toContain("Lebenslauf");
      expect(downloads).toEqual([]);
      expect(await page.evaluate(() => localStorage.getItem("lebenslauf:photo-place:v1"))).toBe(
        before,
      );
    } else {
      const edge = "edge" in item ? item.edge : null;
      const distances = {
        left: webBox[0],
        top: webBox[1],
        right: 210 - webBox[0] - webBox[2],
        bottom: 297 - webBox[1] - webBox[3],
      };
      expect(Math.abs(distances[edge!])).toBeLessThanOrEqual(0.3);
      await expect(button).toBeEnabled();
      const letterCount = await root
        .locator("[data-letter-document-pages] [data-letter-page]")
        .count();
      const downloading = page.waitForEvent("download");
      await button.click();
      const path = join(out, `${item.name}.pdf`);
      await (await downloading).saveAs(path);
      const bytes = await readFile(path);
      const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loading = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
      const document = await loading.promise;
      try {
        const pages = [];
        for (let index = 1; index <= document.numPages; index++) {
          const content = await (await document.getPage(index)).getTextContent();
          const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
          pages.push({ text, markers: normalizeContent(text).match(/QA[A-Z]+\d{3}/g) ?? [] });
        }
        expect(document.numPages).toBe(1 + letterCount + web.length);
        const cvPages = pages.slice(1 + letterCount);
        expect([
          ...contentFindings(
            cvPages,
            fixture.markers.cv,
            fixture.sequences.cv,
            fixture.segments.cv,
          ),
          ...distributionFindings(web, cvPages, "free photo CV"),
          ...contentFindings(
            pages.slice(1, 1 + letterCount),
            fixture.markers.letter,
            fixture.sequences.letter,
            fixture.segments.letter,
          ),
        ]).toEqual([]);
        pdf = {
          sha256: createHash("sha256").update(bytes).digest("hex"),
          pages: document.numPages,
          cvPageIndex: 1 + letterCount,
        };
      } finally {
        await loading.destroy();
      }
    }
    await writeFile(
      join(out, `${item.name}.json`),
      JSON.stringify(
        {
          name: item.name,
          status: "PASS",
          expectedBlocked: blocked,
          item,
          ...runtimeProvenance(),
          storage: fixture.storage,
          webBoxMm: webBox,
          canonicalBoxMm: canonicalBox,
          photoRendering,
          verdict,
          pdf,
          directFailure,
          downloads,
          editorHandlesExcluded: true,
        },
        null,
        2,
      ),
    );
  });
}
