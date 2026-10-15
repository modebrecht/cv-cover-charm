/** Generate the six Item 14 dossiers with the actual browser asset adapters.
 * Usage: bun scripts/docx-next-stress-edge-fixtures.ts OUTPUT_DIRECTORY IMAGE_JSON
 * IMAGE_JSON is produced by the existing docx-next-fixture-images.py script.
 * This runs no native engine, Sidebar probe, deployment or CI workflow.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { decorationAssetKey, type DecorationPaint } from "../src/lib/docx-next/decoration";
import type { NormalizedImage } from "../src/lib/docx-next/images";
import {
  STRESS_EDGE_CASES,
  stressEdgeExpectedFields,
  stressEdgeFixture,
} from "../tests/fixtures/docx-next/stress-edge";
import {
  checkStressFields,
  freezeStressInput,
  stressPackageParts,
} from "../tests/support/docx-next-stress-edge";

const directory = resolve(process.argv[2]);
const images = JSON.parse(await readFile(resolve(process.argv[3]), "utf8"));
assert.equal(typeof images.png, "string");
const modules = await Promise.all(
  ["decoration", "images"].map(async (name) => {
    const bundle = await Bun.build({
      entrypoints: [`src/lib/docx-next/${name}.ts`],
      target: "browser",
      format: "esm",
    });
    assert(bundle.success);
    return bundle.outputs[0].text();
  }),
);
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.evaluate(async (sources: string[]) => {
    const world = globalThis as typeof globalThis & {
      __stressAssets: typeof import("../src/lib/docx-next/decoration") &
        typeof import("../src/lib/docx-next/images");
    };
    world.__stressAssets = Object.assign(
      {},
      ...(await Promise.all(
        sources.map((source) => import(`data:text/javascript;base64,${btoa(source)}`)),
      )),
    );
  }, modules);
  const normalizeImage = async (source: string): Promise<NormalizedImage> => {
    const result = await page.evaluate(async (image: string) => {
      const world = globalThis as typeof globalThis & {
        __stressAssets: typeof import("../src/lib/docx-next/images");
      };
      const asset = await world.__stressAssets.normalizeBrowserImage(image);
      return { ...asset, bytes: Array.from(asset.bytes) };
    }, source);
    return { ...result, bytes: Uint8Array.from(result.bytes) };
  };
  const paints = new Map<string, NormalizedImage>();
  const rasterizeDecoration = async (shape: DecorationPaint): Promise<NormalizedImage> => {
    const key = decorationAssetKey(shape);
    if (!paints.has(key)) {
      const result = await page.evaluate(async (paint: DecorationPaint) => {
        const world = globalThis as typeof globalThis & {
          __stressAssets: typeof import("../src/lib/docx-next/decoration");
        };
        const asset = await world.__stressAssets.rasterizeDecoration(paint);
        return { ...asset, bytes: Array.from(asset.bytes) };
      }, shape);
      paints.set(key, { ...result, bytes: Uint8Array.from(result.bytes) });
    }
    return paints.get(key)!;
  };
  await mkdir(directory, { recursive: true });
  const manifest = [];
  for (const value of STRESS_EDGE_CASES) {
    const input = stressEdgeFixture(value, images.png);
    const expectedFields = stressEdgeExpectedFields(input);
    freezeStressInput(input);
    const model = buildDossierDocModel(input);
    assert.deepEqual(model.issues, []);
    const portable = JSON.parse(JSON.stringify(model));
    freezeStressInput(model);
    freezeStressInput(portable);
    const options = { normalizeImage, rasterizeDecoration };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    const restored = new Uint8Array(
      await (await renderDossierDocx(portable, options)).arrayBuffer(),
    );
    assert.equal(hash(bytes), hash(restored));
    checkStressFields(stressPackageParts(bytes).get("word/document.xml")!, expectedFields);
    await writeFile(`${directory}/${value.id}.docx`, bytes);
    await writeFile(`${directory}/${value.id}.model.json`, JSON.stringify(model, null, 2));
    manifest.push({
      fixture: value.id,
      template: value.template,
      layout: value.layout,
      docxSha256: hash(bytes),
      expectedFields,
      letterParagraphs: 70,
      cvEntries: 66,
      cvProbeTexts: input.cv.data.schule.map((entry) => entry.titel),
    });
  }
  await writeFile(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    JSON.stringify({
      fixtures: manifest.length,
      packagesRendered: manifest.length * 2,
      decorationAssets: paints.size,
      browser: browser.version(),
    }),
  );
} finally {
  await browser.close();
}
