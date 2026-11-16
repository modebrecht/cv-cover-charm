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
  page,
}) => {
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
          };
        },
        { corrected, webImage: `data:image/png;base64,${webImage.toString("base64")}` },
      );
      expect(result.sourceHtml).toBe(geometry.sourceHtml);
      expect(result.ownFill).toBe(false);
      expect(result.ownStroke).toBe(false);
      if (corrected) expect(result.differentPixels).toBe(0);
      else if (geometry.size === geometry.rangeAscent) expect(result.differentPixels).toBe(0);
      else expect(result.differentPixels).toBeGreaterThan(0);
      comparisons.push({ corrected, differentPixels: result.differentPixels });
      await writeFile(
        `${out}/${key}-${corrected ? "corrected" : "default"}.png`,
        Buffer.from(result.png.split(",")[1], "base64"),
      );
    }
    rows.push({ key, geometry, comparisons });
  }
  await writeFile(`${out}/metrics.json`, JSON.stringify(rows, null, 2));
});

test("Maschine uses the same baseline correction in single CV and cover downloads", async ({
  page,
}) => {
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
    await page.getByLabel(/Schriftart gesamtes Dossier/).selectOption("maschine");
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
      .toBe("maschine");
    await page.evaluate(() => document.fonts.ready);
    const sheet = page.locator(selector);
    await expect(sheet).toHaveCount(1);
    await sheet.screenshot({ path: `${out}/single-${part}-web.png`, animations: "disabled" });
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
    await download.saveAs(`${out}/single-${part}.pdf`);
    expect(
      await page.evaluate(() => ({
        cv: localStorage.getItem("lebenslauf:v1"),
        cover: localStorage.getItem("titelblatt:v3"),
        letter: localStorage.getItem("anschreiben:v1"),
      })),
    ).toEqual(before);
    results.push({ part, filename: download.suggestedFilename() });
  }
  await writeFile(`${out}/single-downloads.json`, JSON.stringify(results, null, 2));
});
