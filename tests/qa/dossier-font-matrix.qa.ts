import { expect, test, type CDPSession, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FONT_LABELS, FONT_STACKS, type FontKey } from "../../src/components/cover/types";
import {
  BASE_URL,
  GALLERY_CASES,
  applyGalleryCase,
  seedCanonicalDossier,
  waitEditorReady,
  type CanonicalDossier,
} from "../e2e/support/dossier-gallery-shared";

const out = "artifacts/dossier-font-matrix";
const toleranceMm = 0.3;
let stored: CanonicalDossier;

test.beforeAll(async ({ browser }) => {
  await mkdir(out, { recursive: true });
  const page = await browser.newPage();
  page.on("pageerror", (error) => console.error("Font fixture page error:", error.message));
  try {
    stored = await seedCanonicalDossier(page);
    await writeFile(join(out, "fixture.json"), JSON.stringify(stored, null, 2));
    await writeFile(
      join(out, "SOURCE_SHA.txt"),
      execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }),
    );
    const sourceDiff = execFileSync("git", ["diff", "--binary", "HEAD", "--", "src"], {
      encoding: "utf8",
    });
    await writeFile(join(out, "SOURCE_DIFF.patch"), sourceDiff);
    await writeFile(
      join(out, "SOURCE_DIFF.sha256"),
      createHash("sha256").update(sourceDiff).digest("hex"),
    );
  } finally {
    await page.close();
  }
});

async function measure(sheet: Locator) {
  return sheet.evaluate((root) => {
    const pageBox = root.getBoundingClientRect();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!node.textContent?.trim() || !parent || parent.closest("svg")) continue;
      const style = getComputedStyle(parent);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width && r.height);
      if (!rects.length) continue;
      nodes.push({
        text: node.textContent,
        font: style.font,
        family: style.fontFamily,
        lines: rects.map((r) => [
          ((r.left - pageBox.left) * 210) / pageBox.width,
          ((r.top - pageBox.top) * 297) / pageBox.height,
          (r.width * 210) / pageBox.width,
          (r.height * 297) / pageBox.height,
        ]),
      });
    }
    return { text: (root as HTMLElement).innerText, nodes };
  });
}

async function platformFonts(cdp: CDPSession, selector: string) {
  await cdp.send("DOM.getDocument");
  const { result: object } = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const root = document.querySelector(${JSON.stringify(selector)});
      if (!root) return null;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode()))
        if (node.textContent.trim()) return node.parentElement;
      return null;
    })()`,
  });
  const objectId = object.objectId;
  if (!objectId) throw new Error(`Missing rendered font sample: ${selector}`);
  try {
    const { nodeId } = await cdp.send("DOM.requestNode", { objectId });
    const result = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    expect(result.fonts.length).toBeGreaterThan(0);
    return result.fonts;
  } finally {
    await cdp.send("Runtime.releaseObject", { objectId });
  }
}

async function savedFonts(page: Page) {
  return page.evaluate(() => ({
    cover: JSON.parse(localStorage.getItem("titelblatt:v3") ?? "null")?.font,
    letter: JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null")?.design?.font,
    cv: JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null")?.design?.font,
  }));
}

for (const font of Object.keys(FONT_LABELS) as FontKey[]) {
  test(`font ${font}: UI choice, reload and actual dossier PDF`, async ({ page, context }) => {
    const item = GALLERY_CASES.find((entry) => entry.id === "modern")!;
    await applyGalleryCase(page, stored, item);
    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "networkidle" });
    await waitEditorReady(page);
    const cvToggle = page.locator(
      '[data-editor-section-title="Schrift"] [data-editor-section-toggle]',
    );
    if ((await cvToggle.getAttribute("aria-expanded")) !== "true") await cvToggle.click();
    for (const choice of [font === "sans" ? "freundlich" : "sans", font]) {
      await page.getByLabel(/Schriftart gesamtes Dossier/).selectOption(choice);
      await expect.poll(async () => (await savedFonts(page)).cv).toBe(choice);
      await expect.poll(async () => (await savedFonts(page)).letter).toBe(choice);
    }

    // Cover owns a separate saved choice; selecting it here does not claim an
    // automatic CV-to-cover propagation or overwrite deliberate element styles.
    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "networkidle" });
    await waitEditorReady(page);
    const coverToggle = page.locator(
      '[data-editor-section-title="Schrift und Layout"] [data-editor-section-toggle]',
    );
    if ((await coverToggle.getAttribute("aria-expanded")) !== "true") await coverToggle.click();
    for (const choice of [font === "sans" ? "freundlich" : "sans", font]) {
      await page.getByLabel(/Schriftart gesamtes Dossier/).selectOption(choice);
      await expect.poll(async () => (await savedFonts(page)).cover).toBe(choice);
    }

    const cdp = await context.newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const web = [];
    const parts = [
      ["cover", "titelblatt", 'main [data-dossier-document="cover"]', "[data-dossier-role] > div"],
      [
        "letter",
        "anschreiben",
        "main [data-letter-document-pages] [data-letter-page]",
        "[data-letter-text-layer]",
      ],
      ["cv", "lebenslauf", '[data-export-mode="false"] [data-cv-page]', "[data-cv-name]"],
    ] as const;
    try {
      for (const [kind, route, selector, sample] of parts) {
        await page.goto(`${BASE_URL}/${route}`, { waitUntil: "networkidle" });
        await waitEditorReady(page);
        await page.evaluate(() => document.fonts.ready);
        const sheet = page.locator(selector);
        await expect(sheet).toHaveCount(1);
        await expect
          .poll(async () => savedFonts(page))
          .toEqual({ cover: font, letter: font, cv: font });
        const expectedFamily = await page.evaluate((stack) => {
          const element = document.createElement("span");
          element.style.fontFamily = stack;
          return element.style.fontFamily;
        }, FONT_STACKS[font]);
        const sampleFamily = await sheet
          .locator(sample)
          .first()
          .evaluate((element) => getComputedStyle(element).fontFamily);
        expect(sampleFamily).toBe(expectedFamily);
        const fonts = await platformFonts(cdp, `${selector} ${sample}`);
        if (font === "freundlich")
          expect(
            fonts.some(
              (entry: { familyName: string; isCustomFont: boolean }) =>
                entry.familyName === "Cabin" && entry.isCustomFont,
            ),
          ).toBe(true);
        await sheet.screenshot({ path: join(out, `${font}--${kind}.png`), animations: "disabled" });
        web.push({ kind, sampleFamily, platformFonts: fonts, ...(await measure(sheet)) });
      }
    } finally {
      await cdp.detach();
    }

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const root = page.locator("[data-dossier-pdf-canvas]");
    await expect
      .poll(
        async () =>
          root.evaluate(async (node) => {
            const path = "/src/lib/pdf-preflight.ts";
            return (await import(path)).inspectPdfPreflight(node as HTMLElement, "dossier").status;
          }),
        { timeout: 20_000 },
      )
      .toBe("pass");
    const canonical = [];
    for (const [index, [kind]] of parts.entries()) {
      const selector = [
        '[data-dossier-document="cover"]',
        "[data-letter-document-pages] [data-letter-page]",
        "[data-cv-page]",
      ][index];
      const sheet = root.locator(selector);
      await expect(sheet).toHaveCount(1);
      const actual = await measure(sheet);
      const expected = web[index];
      expect(actual.text, `${font} ${kind} text`).toBe(expected.text);
      expect(actual.nodes).toHaveLength(expected.nodes.length);
      for (const [i, node] of expected.nodes.entries()) {
        const found = actual.nodes[i];
        expect(found.text).toBe(node.text);
        expect(found.font).toBe(node.font);
        expect(found.lines).toHaveLength(node.lines.length);
        for (const [line, box] of node.lines.entries())
          for (const [axis, value] of box.entries())
            expect(Math.abs(found.lines[line][axis] - value)).toBeLessThanOrEqual(toleranceMm);
      }
      canonical.push({ kind, ...actual });
    }
    const beforeDownload = await savedFonts(page);
    const download = page.waitForEvent("download");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "PDF herunterladen", exact: true })
      .click();
    await (await download).saveAs(join(out, `${font}.pdf`));
    expect(await savedFonts(page)).toEqual(beforeDownload);
    await writeFile(
      join(out, `${font}.json`),
      JSON.stringify(
        {
          font,
          label: FONT_LABELS[font],
          template: "modern",
          toleranceMm,
          browserVersion: context.browser()!.version(),
          storedFonts: beforeDownload,
          web,
          canonical,
        },
        null,
        2,
      ),
    );
  });
}
