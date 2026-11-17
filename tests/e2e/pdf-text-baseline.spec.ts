import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  applyGalleryCase,
  BASE_URL,
  GALLERY_CASES,
  seedCanonicalDossier,
  waitEditorReady,
} from "./support/dossier-gallery-shared";

const out = "artifacts/pdf-text-baseline";
test.describe.configure({ timeout: 90_000 });

test("measured browser ascent corrects PDF glyph baselines without changing the source", async ({
  playwright,
}) => {
  // DOM text may use Linux LCD subpixel AA; canvas text uses grayscale AA.
  // Isolate only these synthetic specimens. Real downloads below retain the
  // ordinary browser, and all pixel comparisons retain their zero threshold.
  const browser = await playwright.chromium.launch({ args: ["--disable-lcd-text"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await mkdir(out, { recursive: true });
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
    const rows = [];
    for (const [key, family, size, weight, style] of [
      ["mono40", '"Courier New",Courier,monospace', 40, 700, "normal"],
      ["mono14", '"Courier New",Courier,monospace', 14, 400, "normal"],
      ["mono14italic", '"Courier New",Courier,monospace', 14, 400, "italic"],
      ["sans40", "Arial,sans-serif", 40, 700, "normal"],
      ["cabin40", "Cabin,sans-serif", 40, 700, "normal"],
      ["cabin14", "Cabin,sans-serif", 14, 400, "normal"],
      ["cabin145", "Cabin,sans-serif", 14.5, 400, "normal"],
      ["cabin34", "Cabin,sans-serif", 34.0157, 700, "normal"],
    ] as const) {
      const geometry = await page.evaluate(
        async ({ family, size, weight, style }) => {
          await document.fonts.load(`${style} ${weight} ${size}px ${family}`, "Hg Lea Müller");
          await document.fonts.ready;
          document.getElementById("baseline-specimen")?.remove();
          const box = document.createElement("div");
          box.id = "baseline-specimen";
          Object.assign(box.style, {
            position: "absolute",
            left: "0",
            top: "0",
            width: "600px",
            height: "100px",
            background: "white",
            color: "black",
            fontFamily: family,
            fontSize: `${size}px`,
            fontWeight: String(weight),
            fontStyle: style,
            lineHeight: "1.5",
            zIndex: "999999",
          });
          box.appendChild(document.createTextNode("Hg Lea Müller"));
          const marker = document.createElement("span");
          Object.assign(marker.style, {
            display: "inline-block",
            width: "0",
            height: "0",
            padding: "0",
            margin: "0",
            verticalAlign: "baseline",
          });
          box.appendChild(marker);
          document.body.appendChild(box);
          const range = document.createRange();
          range.selectNode(box.firstChild!);
          const rect = range.getBoundingClientRect();
          const context = document.createElement("canvas").getContext("2d")!;
          context.font = getComputedStyle(box).font;
          return {
            font: context.font,
            size,
            rangeAscent: marker.getBoundingClientRect().top - rect.top,
            canvasAscent: context.measureText("Hg Lea Müller").fontBoundingBoxAscent,
            sourceHtml: box.outerHTML,
          };
        },
        { family, size, weight, style },
      );
      expect(geometry.canvasAscent).toBe(geometry.rangeAscent);
      const webImage = await page
        .locator("#baseline-specimen")
        .screenshot({ path: `${out}/${key}-web.png` });
      const comparisons = [];
      for (const corrected of [false, true]) {
        const result = await page.evaluate(
          async ({ corrected, webImage }) => {
            const path = "/node_modules/.vite/deps/html2canvas-pro.js";
            const html2canvas = (await import(path)).default;
            const modulePath = "/src/lib/pdf-raster.ts";
            const { renderPdfRaster } = await import(modulePath);
            const element = document.getElementById("baseline-specimen")!;
            const options = {
              width: 600,
              height: 100,
              scale: 1,
              scrollX: 0,
              scrollY: 0,
              backgroundColor: "#ffffff",
              logging: false,
            };
            const canvas = await (corrected
              ? renderPdfRaster(html2canvas, element, options)
              : html2canvas(element, options));
            const context = canvas.getContext("2d")!;
            const image = new Image();
            image.src = webImage;
            await image.decode();
            const reference = document.createElement("canvas");
            reference.width = image.naturalWidth;
            reference.height = image.naturalHeight;
            const referenceContext = reference.getContext("2d")!;
            referenceContext.drawImage(image, 0, 0);
            const expected = referenceContext.getImageData(
              0,
              0,
              reference.width,
              reference.height,
            ).data;
            const actual = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let differentPixels = 0;
            let colouredReferencePixels = 0;
            for (let i = 0; i < expected.length; i += 4)
              if (expected[i] !== expected[i + 1] || expected[i] !== expected[i + 2])
                colouredReferencePixels++;
            if (expected.length !== actual.length) throw new Error("Raster dimensions changed");
            for (let i = 0; i < actual.length; i += 4)
              if (
                actual[i] !== expected[i] ||
                actual[i + 1] !== expected[i + 1] ||
                actual[i + 2] !== expected[i + 2] ||
                actual[i + 3] !== expected[i + 3]
              )
                differentPixels++;
            return {
              png: canvas.toDataURL("image/png"),
              sourceHtml: element.outerHTML,
              ownFill: Object.hasOwn(context, "fillText"),
              ownStroke: Object.hasOwn(context, "strokeText"),
              differentPixels,
              colouredReferencePixels,
            };
          },
          { corrected, webImage: `data:image/png;base64,${webImage.toString("base64")}` },
        );
        comparisons.push({
          corrected,
          differentPixels: result.differentPixels,
          colouredReferencePixels: result.colouredReferencePixels,
        });
        await writeFile(
          `${out}/${key}-${corrected ? "corrected" : "default"}.png`,
          Buffer.from(result.png.split(",")[1], "base64"),
        );
        await writeFile(
          `${out}/${key}-metrics.json`,
          JSON.stringify({ key, geometry, comparisons }, null, 2),
        );
        expect(result.colouredReferencePixels, `${key}: grayscale reference`).toBe(0);
        expect(result.sourceHtml, key).toBe(geometry.sourceHtml);
        expect(result.ownFill, key).toBe(false);
        expect(result.ownStroke, key).toBe(false);
        if (corrected) expect(result.differentPixels, key).toBe(0);
        else if (geometry.size === geometry.rangeAscent)
          expect(result.differentPixels, key).toBe(0);
        else expect(result.differentPixels, key).toBeGreaterThan(0);
      }
      rows.push({ key, geometry, comparisons });
    }
    await writeFile(`${out}/metrics.json`, JSON.stringify(rows, null, 2));
  } finally {
    await browser.close();
  }
});

test("zoom normalization preserves native Cabin glyphs at the used font size", async ({
  playwright,
}) => {
  const browser = await playwright.chromium.launch({ args: ["--disable-lcd-text"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await mkdir(out, { recursive: true });
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const rows = [];
    for (const [key, family, size, weight, zoom, outerZoom] of [
      ["cabin-small", "Cabin", 15.52, 400, 0.9, 1],
      ["cabin-body", "Cabin", 15.84, 400, 0.9, 1],
      ["cabin-bold", "Cabin", 17.28, 650, 0.9, 1],
      ["cabin-name", "Cabin", 43.2, 800, 0.9, 1],
      ["cabin-nested", "Cabin", 17.28, 650, 0.9, 0.8],
      ["cabin-unity", "Cabin", 15.84, 400, 1, 1],
      ["cabin-enlarged", "Cabin", 15.84, 400, 1.2, 1],
      ["sans-body", "Arial,sans-serif", 15.84, 400, 0.9, 1],
    ] as const) {
      await page.evaluate(
        async ({ family, size, weight, zoom, outerZoom }) => {
          await document.fonts.load(`${weight} ${size}px ${family}`, "Hg Thomas Müller");
          await document.fonts.ready;
          document.getElementById("zoom-specimen")?.remove();
          const root = document.createElement("div");
          root.id = "zoom-specimen";
          root.style.cssText =
            "position:absolute;left:0;top:0;width:600px;height:100px;background:white;color:black;z-index:999999";
          const outer = document.createElement("div");
          outer.style.zoom = String(outerZoom);
          const text = document.createElement("div");
          text.style.cssText = `width:600px;height:100px;font:${weight} ${size}px ${family};line-height:1.5;zoom:${zoom}`;
          text.textContent = "Hg Thomas Müller";
          outer.append(text);
          root.append(outer);
          document.body.append(root);
        },
        { family, size, weight, zoom, outerZoom },
      );
      const web = await page.locator("#zoom-specimen").screenshot({
        path: `${out}/${key}-zoom-web.png`,
      });
      const result = await page.evaluate(
        async (webImage) => {
          const rendererPath = "/node_modules/.vite/deps/html2canvas-pro.js";
          const { default: html2canvas } = await import(rendererPath);
          const rasterPath = "/src/lib/pdf-raster.ts";
          const { renderPdfRaster } = await import(rasterPath);
          const normalizationPath = "/src/lib/html2canvas-export.ts";
          const { normalizeCssZoomForHtml2Canvas } = await import(normalizationPath);
          const root = document.getElementById("zoom-specimen")!;
          const source = root.outerHTML;
          const canvas = await renderPdfRaster(html2canvas, root, {
            width: 600,
            height: 100,
            scale: 1,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            onclone: (_document: Document, clone: HTMLElement) =>
              normalizeCssZoomForHtml2Canvas(clone),
          });
          const reference = document.createElement("canvas");
          reference.width = 600;
          reference.height = 100;
          const context = reference.getContext("2d")!;
          const image = new Image();
          image.src = webImage;
          await image.decode();
          context.drawImage(image, 0, 0);
          const expected = context.getImageData(0, 0, 600, 100).data;
          const actual = canvas.getContext("2d")!.getImageData(0, 0, 600, 100).data;
          let differentPixels = 0;
          let colouredReferencePixels = 0;
          for (let i = 0; i < expected.length; i += 4) {
            if (expected[i] !== expected[i + 1] || expected[i] !== expected[i + 2])
              colouredReferencePixels++;
            if (
              expected[i] !== actual[i] ||
              expected[i + 1] !== actual[i + 1] ||
              expected[i + 2] !== actual[i + 2] ||
              expected[i + 3] !== actual[i + 3]
            )
              differentPixels++;
          }
          return {
            png: canvas.toDataURL(),
            sourceUnchanged: source === root.outerHTML,
            differentPixels,
            colouredReferencePixels,
          };
        },
        `data:image/png;base64,${web.toString("base64")}`,
      );
      const row = {
        key,
        differentPixels: result.differentPixels,
        colouredReferencePixels: result.colouredReferencePixels,
        sourceUnchanged: result.sourceUnchanged,
      };
      rows.push(row);
      await writeFile(
        `${out}/${key}-zoom-canvas.png`,
        Buffer.from(result.png.split(",")[1], "base64"),
      );
      await writeFile(`${out}/zoom-metrics.json`, JSON.stringify(rows, null, 2));
      expect(row.sourceUnchanged, key).toBe(true);
      expect(row.colouredReferencePixels, key).toBe(0);
      expect(row.differentPixels, key).toBe(0);
    }
  } finally {
    await browser.close();
  }
});

for (const font of ["maschine", "freundlich"] as const) {
  test(`${font} preserves glyphs in single CV and cover downloads`, async ({ page }) => {
    const stored = await seedCanonicalDossier(page);
    await applyGalleryCase(page, stored, GALLERY_CASES.find((item) => item.id === "modern")!);
    const results = [];
    for (const [part, route, section, selector] of [
      ["cv", "lebenslauf", "Schrift", '[data-export-mode="false"] [data-cv-page]'],
      ["cover", "titelblatt", "Schrift und Layout", 'main [data-dossier-document="cover"]'],
    ] as const) {
      await page.goto(`${BASE_URL}/${route}`, { waitUntil: "networkidle" });
      await waitEditorReady(page);
      const toggle = page.locator(
        `[data-editor-section-title="${section}"] [data-editor-section-toggle]`,
      );
      if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
      await page.getByLabel(/Schriftart gesamtes Dossier/).selectOption(font);
      const storageKey = part === "cv" ? "lebenslauf:v1" : "titelblatt:v3";
      await expect
        .poll(() =>
          page.evaluate(
            ({ key, part }) => {
              const saved = JSON.parse(localStorage.getItem(key)!);
              return part === "cv" ? saved.design.font : saved.font;
            },
            { key: storageKey, part },
          ),
        )
        .toBe(font);
      await page.evaluate(() => document.fonts.ready);
      const sheet = page.locator(selector);
      await expect(sheet).toHaveCount(1);
      await sheet.screenshot({
        path: `${out}/single-${font}-${part}-web.png`,
        animations: "disabled",
      });
      const before = await page.evaluate(() => ({
        cv: localStorage.getItem("lebenslauf:v1"),
        cover: localStorage.getItem("titelblatt:v3"),
        letter: localStorage.getItem("anschreiben:v1"),
      }));
      await page.getByRole("button", { name: "Download", exact: true }).click();
      const action = page.getByRole("menuitem", { name: "PDF", exact: true });
      await expect(action).toBeEnabled();
      const pending = page.waitForEvent("download");
      await action.click();
      const download = await pending;
      await download.saveAs(`${out}/single-${font}-${part}.pdf`);
      expect(
        await page.evaluate(() => ({
          cv: localStorage.getItem("lebenslauf:v1"),
          cover: localStorage.getItem("titelblatt:v3"),
          letter: localStorage.getItem("anschreiben:v1"),
        })),
      ).toEqual(before);
      results.push({ part, filename: download.suggestedFilename() });
    }
    await writeFile(`${out}/single-${font}-downloads.json`, JSON.stringify(results, null, 2));
  });
}
