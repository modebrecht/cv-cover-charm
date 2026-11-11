import { expect, test, type Locator } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  BASE_URL,
  GALLERY_CASES,
  applyGalleryCase,
  assertGalleryCatalog,
  galleryBaseName,
  seedCanonicalDossier,
  waitEditorReady,
  type CanonicalDossier,
} from "../e2e/support/dossier-gallery-shared";

const out = "artifacts/web-pdf-gallery";
const geometryToleranceMm = 0.3;
let stored: CanonicalDossier;

test.beforeAll(async ({ browser }) => {
  assertGalleryCatalog();
  await mkdir(out, { recursive: true });
  const page = await browser.newPage();
  try {
    stored = await seedCanonicalDossier(page);
    const photo = await page.evaluate(() => {
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
      return canvas.toDataURL("image/png");
    });
    stored.cover.data.foto = photo;
    stored.cv.data.person.foto = photo;
    for (const item of GALLERY_CASES)
      stored.cover.layout[item.id] = {
        ...stored.cover.layout[item.id],
        foto: {
          ...stored.cover.layout[item.id]?.foto,
          imgZoom: 1.35,
          imgX: 30,
          imgY: 70,
        },
      };
    await writeFile(join(out, "fixture.json"), JSON.stringify(stored, null, 2));
    await writeFile(
      join(out, "SOURCE_SHA.txt"),
      execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }),
    );
  } finally {
    await page.close();
  }
});

async function measure(sheet: Locator) {
  return sheet.evaluate((page) => {
    const p = page.getBoundingClientRect();
    const box = (element: Element) => {
      const r = element.getBoundingClientRect();
      return [
        ((r.left - p.left) * 210) / p.width,
        ((r.top - p.top) * 297) / p.height,
        (r.width * 210) / p.width,
        (r.height * 297) / p.height,
      ];
    };
    const nodes = Array.from(
      page.querySelectorAll<HTMLElement>(
        "[data-block-id], [data-letter-text-layer], [data-letter-pdf-text], [data-letter-pdf-richtext], [data-dossier-chrome], [data-cv-main], [data-cv-sidebar], [data-cv-name], [data-cv-section], [data-cv-entry-title], [data-cv-body], [data-cv-photo]",
      ),
    ).filter((node) => node.getBoundingClientRect().width > 0);
    const photo = page.querySelector('[data-block-id="foto"], [data-cv-photo]');
    return {
      text: (page as HTMLElement).innerText,
      nodes: nodes.map((node) => ({
        text: node.innerText,
        box: box(node),
        font: getComputedStyle(node).font,
      })),
      photo: photo?.querySelector("img") ? box(photo) : null,
    };
  });
}

for (const [index, item] of GALLERY_CASES.entries()) {
  test(`Web/PDF photo reference ${index + 1}/39 ${item.id}`, async ({ page }) => {
    const base = galleryBaseName(index, item.label);
    await applyGalleryCase(page, stored, item);
    await page.evaluate(() => {
      localStorage.setItem(
        "lebenslauf:photo:v2",
        JSON.stringify({ shape: "circle", zoom: 1.35, x: 30, y: 70, borderWidth: 0.3 }),
      );
      localStorage.setItem("lebenslauf:photo-place:v1", JSON.stringify({ mode: "auto" }));
    });
    const web = [];
    for (const [kind, route, selector] of [
      ["cover", "titelblatt", 'main [data-dossier-document="cover"]'],
      ["letter", "anschreiben", "main [data-letter-document-pages] [data-letter-page]"],
      ["cv", "lebenslauf", '[data-export-mode="false"] [data-cv-page]'],
    ]) {
      await page.goto(`${BASE_URL}/${route}`, { waitUntil: "networkidle" });
      await waitEditorReady(page);
      await page.evaluate(() => document.fonts.ready);
      const sheets = page.locator(selector);
      // These fixed short references must stay on one physical page per part.
      await expect(sheets).toHaveCount(1);
      const sheet = sheets.first();
      if (kind === "letter")
        await expect(
          sheet.locator("xpath=ancestor::*[@data-letter-document-root]"),
        ).toHaveAttribute("data-letter-pagination-ready", "true");
      await sheet.screenshot({ path: join(out, `${base}--${kind}.png`), animations: "disabled" });
      web.push({ kind, ...(await measure(sheet)) });
    }
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const root = page.locator("[data-dossier-pdf-canvas]");
    const button = page
      .getByRole("dialog")
      .getByRole("button", { name: "PDF herunterladen", exact: true });
    const inspect = () =>
      root.evaluate(async (node) => {
        const path = "/src/lib/pdf-preflight.ts";
        return (await import(path)).inspectPdfPreflight(node as HTMLElement, "dossier");
      });
    await expect.poll(async () => (await inspect()).status, { timeout: 20_000 }).toBe("pass");
    const canonical = [];
    for (const selector of [
      '[data-dossier-document="cover"]',
      "[data-letter-document-pages] [data-letter-page]",
      "[data-cv-page]",
    ]) {
      await expect(root.locator(selector)).toHaveCount(1);
      canonical.push(await measure(root.locator(selector)));
    }
    await writeFile(
      join(out, `${base}.json`),
      JSON.stringify(
        {
          template: item.id,
          label: item.label,
          geometryToleranceMm,
          web,
          canonical,
        },
        null,
        2,
      ),
    );
    for (const [pageIndex, expected] of web.entries()) {
      const actual = canonical[pageIndex];
      expect(actual.text, `${item.id} ${expected.kind} text`).toBe(expected.text);
      expect(actual.nodes).toHaveLength(expected.nodes.length);
      for (const [nodeIndex, node] of expected.nodes.entries()) {
        const actualNode = actual.nodes[nodeIndex];
        expect(actualNode.text).toBe(node.text);
        expect(actualNode.font).toBe(node.font);
        for (let axis = 0; axis < 4; axis++)
          expect(Math.abs(actualNode.box[axis] - node.box[axis])).toBeLessThanOrEqual(
            geometryToleranceMm,
          );
      }
    }
    expect(web[0].photo, "authored cover photo").not.toBeNull();
    expect(web[2].photo, "authored CV photo").not.toBeNull();
    await expect(button).toBeEnabled();
    const pending = page.waitForEvent("download");
    await button.click();
    await (await pending).saveAs(join(out, `${base}.pdf`));
  });
}
