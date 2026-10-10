/** Exercise the shared app snapshot/model/export path; no fixture-model rewriting. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { createDossierDocxNextBlob } from "../src/lib/docx-next/export";
import { renderDossierDocx, type RenderOptions } from "../src/lib/docx-next/renderer";
import { walkBlocks, type DocBlock, type TableBlock } from "../src/lib/docx-next/model";
import { readZipEntries } from "../src/lib/docx-next/zip";
import type { NormalizedImage } from "../src/lib/docx-next/images";
import { sidebarFixture, type SidebarFixture } from "../tests/fixtures/docx-next/sidebar";
import { paragraphSignature } from "../tests/fixtures/docx-next/sidebar-floating";

export const APP_BODY_CASES: { kind: SidebarFixture; side?: "left" | "right" }[] = [
  { kind: "both-long" },
  { kind: "both-long", side: "right" },
  { kind: "left" },
  { kind: "right" },
  { kind: "paragraph-long" },
  { kind: "side-paragraph-long" },
  { kind: "side-entries-long" },
  { kind: "side-entries-smaller-body" },
  { kind: "placements" },
  { kind: "styled" },
  { kind: "photo-left" },
  { kind: "photo-right" },
  { kind: "photo-main" },
  { kind: "photo-free-main" },
  { kind: "photo-free-side" },
  { kind: "photo-free-mirrored-side" },
  { kind: "photo-free-low" },
  { kind: "photo-free-portrait" },
  { kind: "photo-free-chrome" },
  { kind: "contact-long" },
  { kind: "chrome-continuation" },
  { kind: "chrome-leading" },
];
const directory = process.argv[2];
const cacheDirectory = process.argv[3] === "--normalized-cache" ? process.argv[4] : undefined;
if (!directory || !(process.argv.length === 3 || (cacheDirectory && process.argv.length === 5)))
  throw Error(
    "Usage: bun scripts/docx-next-sidebar-body-probe.ts DIRECTORY [--normalized-cache VERIFIED_BROWSER_FIXTURES]",
  );
await mkdir(directory, { recursive: true });
const hash = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const images: Record<string, string> = JSON.parse(
  await readFile(path.join(cacheDirectory ?? directory, "images.json"), "utf8"),
);
const normalized = new Map<string, NormalizedImage>();
const imageEvidence: object[] = [];
let closeBrowser: (() => Promise<void>) | undefined;
if (cacheDirectory) {
  // Local read-only replay of actual browser output. CI must run the default fresh browser path.
  for (const [key, source] of Object.entries(images)) {
    const bytes = new Uint8Array(
      await readFile(path.join(cacheDirectory, `normalized-${key}.png`)),
    );
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    assert.equal(Buffer.from(bytes.subarray(0, 8)).toString("hex"), "89504e470d0a1a0a");
    normalized.set(source, {
      bytes,
      widthPx: view.getUint32(16),
      heightPx: view.getUint32(20),
      extension: "png",
      contentType: "image/png",
    });
    imageEvidence.push({
      key,
      mode: "verified-browser-output-replay",
      sourceSha256: hash(source),
      pngSha256: hash(bytes),
    });
    await writeFile(path.join(directory, `normalized-${key}.png`), bytes);
  }
} else {
  const require = createRequire(import.meta.url);
  const { chromium } = require(
    process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
      ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright")
      : "playwright",
  );
  const bundle = await Bun.build({
    entrypoints: ["src/lib/docx-next/images.ts"],
    target: "browser",
    format: "esm",
  });
  assert(bundle.success);
  const moduleCode = await bundle.outputs[0].text();
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.DOCX_NEXT_CHROMIUM_PATH
      ? { executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  closeBrowser = () => browser.close();
  const page = await browser.newPage();
  await page.goto("about:blank");
  for (const [key, source] of Object.entries(images)) {
    const result = await page.evaluate(
      async ({ source, moduleCode }: { source: string; moduleCode: string }) => {
        const module = await import(`data:text/javascript;base64,${btoa(moduleCode)}`);
        const image = await module.normalizeBrowserImage(source);
        return { ...image, bytes: Array.from(image.bytes) };
      },
      { source, moduleCode },
    );
    const image = { ...result, bytes: Uint8Array.from(result.bytes) };
    normalized.set(source, image);
    imageEvidence.push({
      key,
      mode: "fresh-browser",
      sourceSha256: hash(source),
      pngSha256: hash(image.bytes),
    });
    await writeFile(path.join(directory, `normalized-${key}.png`), image.bytes);
  }
}
try {
  const options: RenderOptions = {
    allowUnacceptedModelIssues: true,
    normalizeImage: async (source) => {
      const asset = normalized.get(source);
      assert(asset, "Unknown real image source");
      return asset;
    },
  };
  const diagnostic = {
    cvSidebarComposition: "body-stories" as const,
    chromeFirstPageIdentity: "distinct-stories" as const,
  };
  const names: string[] = [];
  for (const value of APP_BODY_CASES) {
    const name = `app-body-${value.kind}${value.side ? "-" + value.side : ""}`;
    const input = sidebarFixture(value.kind, images["icc-jpeg"]);
    if (value.side) input.settings.sidebarSide = value.side;
    const before = structuredClone(input);
    const original = buildDossierDocModel(input);
    const model = buildDossierDocModel(input, diagnostic),
      modelBefore = structuredClone(model);
    assert.deepEqual(paragraphSignature(model.cv.blocks), paragraphSignature(original.cv.blocks));
    for (const part of ["cover", "letter"] as const) {
      const { firstFooter, firstHeader, ...existing } = model[part];
      if (original[part].firstHeader) Object.assign(existing, { firstHeader });
      else if (firstHeader)
        assert.deepEqual(
          firstHeader.map((paragraph) => ({
            ...paragraph,
            id: paragraph.id.replace(".header.first.", ".header."),
            runs: paragraph.runs.map((run) => ({
              ...run,
              id: run.id.replace(".header.first.", ".header."),
            })),
          })),
          original[part].header,
        );
      assert.deepEqual(existing, original[part]);
    }
    await assert.rejects(
      createDossierDocxNextBlob(input, diagnostic),
      /(?:first footer identity|body boundary) is unaccepted/,
    );
    const bytes = new Uint8Array(
      await (await createDossierDocxNextBlob(input, { ...options, ...diagnostic })).arrayBuffer(),
    );
    assert.deepEqual(
      bytes,
      new Uint8Array(
        await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
      ),
    );
    assert.deepEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input)), diagnostic), model);
    assert.deepEqual(input, before);
    assert.deepEqual(model, modelBefore);
    const baseline = readZipEntries(
      new Uint8Array(await (await renderDossierDocx(original, options)).arrayBuffer()),
    );
    const candidate = readZipEntries(bytes);
    const addedFirstFooterStories = [model.cover, model.letter, model.cv]
      .filter((part) => part.firstFooter)
      .map((part) => `word/${part.id}-footer-first.xml`);
    const addedFirstHeaderStories = [model.cover, model.letter, model.cv]
      .filter((part) => part.firstHeader && !original[part.id].firstHeader)
      .map((part) => `word/${part.id}-header-first.xml`);
    assert.deepEqual(
      candidate
        .filter((part) => !baseline.some((old) => old.name === part.name))
        .map((part) => part.name)
        .sort(),
      [...addedFirstFooterStories, ...addedFirstHeaderStories].sort(),
    );
    const changed = new Set([
      "word/document.xml",
      ...(addedFirstFooterStories.length
        ? ["[Content_Types].xml", "word/_rels/document.xml.rels"]
        : []),
    ]);
    for (const old of baseline)
      if (!changed.has(old.name))
        assert.deepEqual(candidate.find((part) => part.name === old.name)!.bytes, old.bytes);
    const table = model.cv.blocks.find((block) => block.kind === "table") as TableBlock;
    assert(table?.id === "cv.sidebar" && table.rows.length === 1);
    const indexes = model.cv.layout.side === "left" ? { side: 0, main: 2 } : { main: 0, side: 2 };
    const text = (blocks: DocBlock[]) =>
      paragraphSignature(blocks).map((paragraph) => paragraph.runs.map((run) => run.text).join(""));
    const lane = (index: number) => {
      const paint = table.rows[0].cellDecorations![index]!;
      const available =
        model.cv.page.widthMm - model.cv.page.margins.left - model.cv.page.margins.right;
      const total = table.widths.reduce((a, b) => a + b, 0);
      const left =
        model.cv.page.margins.left +
        (available * table.widths.slice(0, index).reduce((a, b) => a + b, 0)) / total;
      return {
        leftMm: left + paint.paddingXMm,
        rightMm: left + (available * table.widths[index]) / total - paint.paddingXMm,
      };
    };
    const first = table.rows[0].cells
      .flatMap((cell) =>
        cell.flatMap((block) => (block.kind === "section" ? block.blocks : [block])),
      )
      .find((block) => block.kind === "paragraph");
    assert(first?.kind === "paragraph", "Missing direct canonical owner paragraph");
    const pictures = Object.entries(indexes).flatMap(([story, index]) =>
      walkBlocks(table.rows[0].cells[index])
        .filter((block) => block.kind === "image")
        .map((image) => ({
          id: image.id,
          story,
          widthMm: image.widthMm,
          heightMm: image.widthMm * (image.frame?.heightRatio ?? 1.5),
          borderWidthMm: image.frame?.borderWidthMm ?? 0,
        })),
    );
    const fixture = {
      fixture: name,
      sourceSha256: hash(bytes),
      sharedSnapshotExport: true,
      sourceColumnRounding: table.columnRounding,
      bodyBoundaryKeepNext: true,
      bodyBoundaryLeadMm: table.bodyBoundaryLeadMm ?? 0,
      paragraphPoliciesUnchanged: true,
      existingStoryPartsUnchanged: true,
      addedFirstFooterStories,
      addedFirstHeaderStories,
      sourceImageNormalizer: cacheDirectory ? "verified-browser-output-replay" : "fresh-browser",
      margins: model.cv.page.margins,
      page: model.cv.page,
      layout: model.cv.layout,
      mainLane: lane(indexes.main),
      sideLane: lane(indexes.side),
      declaredStoryCells: indexes,
      mainText: text(table.rows[0].cells[indexes.main]),
      sideText: text(table.rows[0].cells[indexes.side]),
      canonicalOwnerFieldIds: [first.id],
      nativeParagraphs: paragraphSignature(model.cv.blocks).map((paragraph) => ({
        fieldId: paragraph.id,
        text: paragraph.runs.map((run) => run.text).join(""),
      })),
      firstHeaderText: text(model.cv.firstHeader ?? model.cv.header),
      headerText: text(model.cv.header),
      footerText: text(model.cv.footer),
      pictures,
    };
    await writeFile(path.join(directory, name + ".docx"), bytes);
    await writeFile(path.join(directory, name + ".json"), JSON.stringify(fixture, null, 2) + "\n");
    names.push(name);
    console.log(
      JSON.stringify({
        fixture: name,
        paragraphs: fixture.nativeParagraphs.length,
        pictures: pictures.length,
      }),
    );
  }
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(names, null, 2) + "\n");
  await writeFile(
    path.join(directory, "image-normalization-report.json"),
    JSON.stringify(imageEvidence, null, 2) + "\n",
  );
} finally {
  await closeBrowser?.();
}
