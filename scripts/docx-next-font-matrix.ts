/** Generate actual production packages and immutable font ownership evidence. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fontMatrixFixture, MATRIX_CASES } from "../tests/fixtures/docx-next/font-matrix";
import { NEXT_TEMPLATES } from "../src/lib/docx-next/templates";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { walkBlocks } from "../src/lib/docx-next/model";
import { fontDefinition } from "../src/lib/docx-next/fonts";
import { renderDossierDocx, type RenderOptions } from "../src/lib/docx-next/renderer";
import { decorationAssetKey, type DecorationPaint } from "../src/lib/docx-next/decoration";
import type { NormalizedImage } from "../src/lib/docx-next/images";
import { planPartSections } from "../src/lib/docx-next/section-plan";

const directory = path.resolve(process.argv[2]);
await mkdir(directory, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright")
    : "playwright",
);
const bundle = await Bun.build({
  entrypoints: ["src/lib/docx-next/decoration.ts"],
  target: "browser",
  format: "esm",
});
assert(bundle.success, "Production decoration bundle failed");
const code = await bundle.outputs[0].text();
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  ...(process.env.DOCX_NEXT_CHROMIUM_PATH
    ? { executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH }
    : {}),
});
const page = await browser.newPage();
await page.goto("about:blank");
const cache = new Map<string, NormalizedImage>();
const options: RenderOptions = {
  rasterizeDecoration: async (shape: DecorationPaint) => {
    const key = decorationAssetKey(shape);
    if (cache.has(key)) return cache.get(key)!;
    const value = await page.evaluate(
      async ({ shape, code }: { shape: DecorationPaint; code: string }) => {
        const mod = await import(`data:text/javascript;base64,${btoa(code)}`);
        const asset = await mod.rasterizeDecoration(shape);
        return { ...asset, bytes: Array.from(asset.bytes) };
      },
      { shape, code },
    );
    const asset = { ...value, bytes: Uint8Array.from(value.bytes) };
    cache.set(key, asset);
    return asset;
  },
  normalizeImage: async () => {
    throw new Error("Font matrix unexpectedly requested a photo");
  },
  onDecorationFailure: (id, error) => {
    throw new Error(`Production decoration failed: ${id}`, { cause: error });
  },
};
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const manifest = {
  sourceSha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  templates: Object.keys(NEXT_TEMPLATES).sort(),
  scenarios: MATRIX_CASES,
  wordAcceptance: "UNVERIFIED",
  fixtures: [] as object[],
};
assert.equal(manifest.templates.length, 39);
try {
  for (const template of manifest.templates) {
    for (const scenario of MATRIX_CASES) {
      const key = `${template}--${scenario}`;
      const input = fontMatrixFixture(template, scenario);
      const inputBefore = structuredClone(input);
      const model = buildDossierDocModel(input);
      const before = structuredClone(model);
      const restored = buildDossierDocModel(JSON.parse(JSON.stringify(input)));
      assert.deepEqual(restored, model, `${key}: portable source altered font policy`);
      const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
      const restoredBytes = new Uint8Array(
        await (await renderDossierDocx(restored, options)).arrayBuffer(),
      );
      assert.deepEqual(bytes, restoredBytes, `${key}: JSON changed actual package bytes`);
      assert.deepEqual(model, before, `${key}: renderer mutated model`);
      assert.deepEqual(input, inputBefore, `${key}: build mutated portable data`);
      await writeFile(path.join(directory, `${key}.docx`), bytes);
      const paragraphs = [model.cover, model.letter, model.cv].flatMap((part) =>
        walkBlocks([
          ...part.blocks,
          ...part.header,
          ...(part.firstHeader ?? []),
          ...part.footer,
          ...(part.firstFooter ?? []),
        ]).flatMap((b) =>
          b.kind === "paragraph" && b.runs.length
            ? [
                {
                  part: part.id,
                  id: b.id,
                  runs: b.runs.map((r) => ({
                    text: r.text,
                    font: r.style.font,
                    bold: r.style.bold,
                    italic: r.style.italic,
                    allCaps: r.style.allCaps ?? false,
                  })),
                },
              ]
            : [],
        ),
      );
      const fonts = [
        ...new Set([model.theme.font, ...paragraphs.flatMap((p) => p.runs.map((r) => r.font))]),
      ].sort();
      manifest.fixtures.push({
        key,
        template,
        scenario,
        bytes: bytes.length,
        sha256: sha(bytes),
        fontPolicy: model.fonts,
        definitions: fonts.map(fontDefinition),
        paragraphs,
        parts: [model.cover, model.letter, model.cv].map((part) => ({
          id: part.id,
          margins: part.page.margins,
        })),
        sections: [model.cover, model.letter, model.cv].reduce(
          (n, part) => n + planPartSections(part).length,
          0,
        ),
        render: !scenario.startsWith("selected-") && !scenario.startsWith("fallback-"),
        portableJson: "identical-source-model-and-package",
        productionGuards: "enabled",
      });
    }
    console.log(`${template}: ${MATRIX_CASES.length} production packages`);
  }
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
} finally {
  await browser.close();
}
