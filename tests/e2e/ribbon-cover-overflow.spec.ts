import { expect, test, type Page } from "@playwright/test";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { paginationFixture } from "../qa/pagination-fixtures";
import { loadFixture } from "../qa/pagination-browser";
import { BASE_URL, waitEditorReady } from "./support/dossier-gallery-shared";

const dir = "artifacts/ribbon-cover-overflow";
const cover = '[data-dossier-document="cover"][data-dossier-template="ribbon"]';
const canonical = '[data-dossier-pdf-canvas] ' + cover;
const photo = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#d5e6ed"/><circle cx="450" cy="470" r="270" fill="#476f86"/></svg>'
);
const cases = [
  { id: "no-photo", data: { foto: null }, layout: {} },
  { id: "photo", data: { foto: photo }, layout: {} },
  { id: "crop", data: { foto: photo }, layout: { foto: { x: 20, y: 33, w: 56, ratio: 1, imgZoom: 2, imgX: 30, imgY: 70 } } },
  { id: "long-name", data: { vorname: "Lea Annemarie", nachname: "Müller-Schneider" }, layout: { name: { size: 21, font: "serif" } } },
  { id: "long-date", data: { ort: "Münchenstein bei Basel", datum: "Mittwoch, 14. Oktober 2026" }, layout: { ortDatum: { size: 8 } }, margins: true },
] as const;

async function seed(page: Page, item: { data: Record<string, unknown>; layout: Record<string, unknown>; margins?: boolean }) {
  const f = paginationFixture("brief", { schools: 1, works: 1, paragraphs: 2 });
  const saved = JSON.parse(f.storage["titelblatt:v3"]);
  saved.template = "ribbon";
  saved.data = { ...saved.data, kicker: "Bewerbung um eine Lehrstelle als", ...item.data };
  saved.layout = { ...saved.layout, ribbon: item.layout };
  f.storage["titelblatt:v3"] = JSON.stringify(saved);
  if (item.margins) f.storage["bewerbungsdossier:page-margins:v1"] = JSON.stringify({
    cv: { top: 24, left: 22, right: 22, bottom: 1 },
    letter: { top: 24, left: 22, right: 22, bottom: 24 },
  });
  await loadFixture(page, f, "letter");
}

async function positions(page: Page, selector: string) {
  return page.locator(selector).first().evaluate(root => {
    const pageBox = root.getBoundingClientRect();
    const sx = 210 / pageBox.width, sy = 297 / pageBox.height;
    return Array.from(root.querySelectorAll<HTMLElement>("[data-block-id]"))
      .filter(el => getComputedStyle(el).display !== "none")
      .map(el => {
        const r = (el.firstElementChild ?? el).getBoundingClientRect();
        return {
          id: el.dataset.blockId,
          x: +((r.left-pageBox.left)*sx).toFixed(3), y: +((r.top-pageBox.top)*sy).toFixed(3),
          w: +(r.width*sx).toFixed(3), h: +(r.height*sy).toFixed(3),
          transform: getComputedStyle(el).transform,
        };
      });
  });
}

function assertInside(values: Awaited<ReturnType<typeof positions>>) {
  for (const b of values) {
    if (b.h <= 0 || b.w <= 0) continue;
    expect(b.x, b.id).toBeGreaterThanOrEqual(-0.3);
    expect(b.y, b.id).toBeGreaterThanOrEqual(-0.3);
    expect(b.x + b.w, b.id).toBeLessThanOrEqual(210.3);
    expect(b.y + b.h, b.id).toBeLessThanOrEqual(297.3);
  }
  for (const id of ["foto", "ortDatum", "name", "kicker", "beruf", "lehrbeginn", "kontakt"]) {
    const block = values.find(b => b.id === id);
    expect(block, id).toBeDefined();
    expect(block?.transform, id).toBe("none");
  }
}

async function verdict(page: Page) {
  return page.evaluate(async () => {
    const { inspectPdfPreflight } = await import("/src/lib/pdf-preflight.ts");
    return inspectPdfPreflight(document.querySelector<HTMLElement>("[data-dossier-pdf-canvas]"), "dossier");
  });
}
async function review(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("button", { name: /Gesamtdossier herunterladen/ });
  await expect(trigger).toContainText("Format wählen", { timeout: 25000 });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(dialog).toBeVisible({ timeout: 15000 }).catch(async error => {
    const snapshot = (await page.locator("body").innerText()).slice(0, 2500);
    throw new Error(`${error.message}\nBrowser exceptions: ${errors.join(" | ")}\nVisible page: ${snapshot}`);
  });
  await expect(page.locator(canonical)).toHaveCount(1);
  await expect.poll(async () => (await verdict(page)).status, { timeout: 60_000 }).not.toBe("pending");
  return dialog;
}

for (const item of cases) {
  test("Ribbon real A4 and combined PDF: " + item.id, async ({ page }) => {
    test.setTimeout(240_000);
    await seed(page, item);
    await page.goto(BASE_URL + "/titelblatt", { waitUntil: "domcontentloaded" });
    await waitEditorReady(page);
    await expect(page.locator(cover).first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const before = await positions(page, cover);
    assertInside(before);
    const dialog = await review(page);
    const after = await positions(page, canonical);
    assertInside(after);
    for (const b of before) {
      const other = after.find(x => x.id === b.id);
      if (!other) continue;
      for (const k of ["x", "y", "w", "h"] as const)
        expect(Math.abs(b[k]-other[k]), item.id + " " + b.id + " " + k).toBeLessThan(0.5);
    }
    const image = await page.locator(canonical + ' [data-block-id="foto"]').evaluate(el => {
      const frame = el.firstElementChild!;
      const img = el.querySelector("img");
      return { overflow: getComputedStyle(frame).overflow, complete: img?.complete, width: img?.naturalWidth };
    });
    expect(image.overflow).toBe("hidden");
    if (item.data.foto) {
      expect(image.complete).toBe(true);
      expect(image.width).toBeGreaterThan(0);
    }
    const result = await verdict(page);
    expect(result.status, JSON.stringify(result.issues)).toBe("pass");
    const button = dialog.getByRole("button", { name: "PDF herunterladen", exact: true });
    await expect(button).toBeEnabled();
    const downloadPending = page.waitForEvent("download", { timeout: 120_000 });
    await button.click();
    const download = await downloadPending;
    await mkdir(dir, { recursive: true });
    const target = dir + "/" + item.id + ".pdf";
    await copyFile((await download.path())!, target);
    expect((await stat(target)).size).toBeGreaterThan(10000);
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await getDocument({ data: new Uint8Array(await readFile(target)), disableFontFace: true }).promise;
    expect(pdf.numPages).toBeGreaterThanOrEqual(3);
    const extracted = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const p = await pdf.getPage(i);
      extracted.push((await p.getTextContent()).items.map(t => "str" in t ? t.str : "").join(" "));
    }
    const contents = extracted.join(" ").replace(/\s+/g, "");
    const name = String(item.data.vorname ?? "Lea") + String(item.data.nachname ?? "Müller");
    expect(contents).toContain(name);
    expect(contents).toContain("QASALUTATION001");
    expect(contents).toContain("QASCHOOL001");
    await writeFile(dir + "/" + item.id + ".json", JSON.stringify({ before, after, image, result, pages: pdf.numPages }, null, 2));
  });
}

test("unsafe old Ribbon offsets remain blocked, without override", async ({ page }) => {
  test.setTimeout(180_000);
  await seed(page, { data: { foto: photo }, layout: {} });
  const dialog = await review(page);
  await page.addStyleTag({ content:
    canonical + ' [data-block-id="foto"]{transform:translate(-57mm,-60mm) scale(.82)!important}\n' +
    canonical + ' [data-block-id="ortDatum"]{transform:translate(-45mm,26mm)!important}'
  });
  const bad = await positions(page, canonical);
  expect(bad.find(b => b.id === "foto")!.x).toBeLessThan(0);
  const result = await verdict(page);
  expect(result.status).toBe("blocked");
  expect(result.issues.some(i => i.documentKind === "cover" && i.code === "physical-overflow")).toBe(true);
  await expect(dialog.getByRole("button", { name: "PDF herunterladen", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "PDF trotzdem herunterladen", exact: true })).toHaveCount(0);
  const api = await page.evaluate(async () => {
    const { downloadCombinedDossierPdf } = await import("/src/lib/dossier-pdf.ts");
    try {
      await downloadCombinedDossierPdf(document.querySelector<HTMLElement>("[data-dossier-pdf-canvas]"), "unsafe.pdf", { title: "QA", author: "QA" });
      return "UNSAFE SUCCESS";
    } catch (error) { return error instanceof Error ? error.message : String(error); }
  });
  expect(api).not.toBe("UNSAFE SUCCESS");
  await mkdir(dir, { recursive: true });
  await writeFile(dir + "/negative.json", JSON.stringify({ bad, result, api }, null, 2));
});
