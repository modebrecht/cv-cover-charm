import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { jsPDF } from "jspdf";
import {
  applyGalleryCase,
  BASE_URL,
  GALLERY_CASES,
  waitEditorReady,
} from "../e2e/support/dossier-gallery-shared";
import { runtimeProvenance } from "./pagination-browser";

const out = "artifacts/photo-circle-raster";

// Run the targeted Web/PDF gallery first: reuse its exact synthetic input.
for (const id of ["terracotta", "studio3"]) {
  test(`288 dpi circle contour diagnostic: ${id}`, async ({ page }) => {
    await mkdir(out, { recursive: true });
    const stored = JSON.parse(await readFile("artifacts/web-pdf-gallery/fixture.json", "utf8"));
    await applyGalleryCase(page, stored, GALLERY_CASES.find((item) => item.id === id)!);
    await page.evaluate(() => {
      localStorage.setItem(
        "lebenslauf:photo:v2",
        JSON.stringify({ shape: "circle", zoom: 1.35, x: 30, y: 70, borderWidth: 0.3 }),
      );
      localStorage.setItem("lebenslauf:photo-place:v1", JSON.stringify({ mode: "auto" }));
    });
    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "networkidle" });
    await waitEditorReady(page);
    await page.evaluate(() => document.fonts.ready);
    const sheet = page.locator('[data-export-mode="false"] [data-cv-page]').first();
    const web = await sheet.evaluate((sheet) => {
      const page = sheet.getBoundingClientRect();
      const photo = sheet.querySelector("[data-cv-photo]")!.getBoundingClientRect();
      return {
        page: [page.width, page.height],
        photo: [photo.x - page.x, photo.y - page.y, photo.width, photo.height],
      };
    });
    await sheet.screenshot({ path: join(out, `${id}-web3.png`), animations: "disabled" });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const source = page.locator("[data-dossier-pdf-canvas] [data-cv-page]").first();
    await expect(source.locator("[data-cv-photo] img")).toHaveCount(1);
    const raster = await source.evaluate(async (source) => {
      const modulePath = "/src/lib/html2canvas-export.ts";
      const canvasPath = "/node_modules/.vite/deps/html2canvas-pro.js";
      const normalize = (await import(modulePath)).normalizeCssZoomForHtml2Canvas;
      const html2canvas = (await import(canvasPath)).default;
      const canvas = await html2canvas(source, {
        scale: 3,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (_document: Document, clone: HTMLElement) => normalize(clone),
      });
      return {
        png: canvas.toDataURL("image/png"),
        jpeg94: canvas.toDataURL("image/jpeg", 0.94),
        jpeg100: canvas.toDataURL("image/jpeg", 1),
      };
    });
    await writeFile(
      join(out, `${id}-raster3.png`),
      Buffer.from(raster.png.split(",")[1], "base64"),
    );
    // Isolate encoding from HTML rasterization: every variant owns the same
    // canvas and A4 placement. The report checks JPEG94 against the real UI PDF.
    for (const [encoding, data] of Object.entries(raster)) {
      const format = encoding === "png" ? "PNG" : "JPEG";
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      pdf.addImage(data, format, 0, 0, 210, 297, undefined, "FAST");
      await writeFile(
        join(out, `${id}-${encoding}.${encoding === "png" ? "png" : "jpg"}`),
        Buffer.from(data.split(",")[1], "base64"),
      );
      await writeFile(join(out, `${id}-${encoding}.pdf`), Buffer.from(pdf.output("arraybuffer")));
    }
    await writeFile(
      join(out, `${id}.json`),
      JSON.stringify({ template: id, dpi: 288, web, ...runtimeProvenance() }, null, 2),
    );
  });
}
