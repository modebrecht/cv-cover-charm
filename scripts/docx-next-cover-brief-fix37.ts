/** Reproducible bounded candidate. Does not change the production exporter. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  authoredCoverFixture,
  AUTHORED_COVER_CASES,
} from "../tests/fixtures/docx-next/cover-authored";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { readZipEntries } from "../src/lib/docx-next/zip";
import { decorationAssetKey, type DecorationPaint } from "../src/lib/docx-next/decoration";
import type { NormalizedImage } from "../src/lib/docx-next/images";

const out = path.resolve(process.argv[2] ?? "docs/qa/docx-next-cover-brief-fix-15okt");
await mkdir(out, { recursive: true });
// Public, synthetic red/blue test image from the independently reproduced package.
const original = new Uint8Array(
  await readFile("docs/qa/docx-next-cover-independent-15okt/brief-baseline.docx"),
);
const image = readZipEntries(original).find((e) => e.name === "word/media/image-1.png")!.bytes;
const photo = "data:image/png;base64," + Buffer.from(image).toString("base64");
const require = createRequire(import.meta.url);
const { chromium } = require(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES!, "playwright"),
);
const bundle = await Bun.build({
  entrypoints: ["src/lib/docx-next/decoration.ts"],
  target: "browser",
  format: "esm",
});
assert(bundle.success);
const code = await bundle.outputs[0].text();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const cache = new Map<string, NormalizedImage>();
const renderOptions = {
  allowUnacceptedModelIssues: true,
  normalizeImage: async () => ({
    bytes: image,
    widthPx: 120,
    heightPx: 180,
    contentType: "image/png" as const,
    extension: "png" as const,
  }),
  rasterizeDecoration: async (shape: DecorationPaint) => {
    const key = decorationAssetKey(shape);
    if (cache.has(key)) return cache.get(key)!;
    const asset = await page.evaluate(
      async ({ shape, code }) => {
        const mod = await import(`data:text/javascript;base64,${btoa(code)}`);
        const result = await mod.rasterizeDecoration(shape);
        return { ...result, bytes: Array.from(result.bytes) };
      },
      { shape, code },
    );
    const value = { ...asset, bytes: Uint8Array.from(asset.bytes as number[]) } as NormalizedImage;
    cache.set(key, value);
    return value;
  },
};
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const evidence: unknown[] = [];
try {
  for (const name of process.env.DOCX_NEXT_COVER_CASES?.split(",") ?? AUTHORED_COVER_CASES) {
    const dir = path.join(out, name);
    await mkdir(dir, { recursive: true });
    const input = authoredCoverFixture(name as (typeof AUTHORED_COVER_CASES)[number], photo),
      before = JSON.stringify(input);
    const measured = process.env.DOCX_NEXT_COVER_METRICS_DIR
      ? JSON.parse(
          await readFile(
            path.join(process.env.DOCX_NEXT_COVER_METRICS_DIR, name, "web-evidence.json"),
            "utf8",
          ),
        )
      : undefined;
    if (measured)
      assert(
        measured.fontProfile && measured.textMetrics,
        "Measured candidate requires a declared font profile and text metrics",
      );
    const baseline = buildDossierDocModel(input),
      candidate = buildDossierDocModel(input, {
        coverComposition: "authored-frames",
        ...(measured ? { coverTextMetrics: measured.textMetrics } : {}),
      });
    assert.deepEqual(candidate.letter, baseline.letter);
    assert.deepEqual(candidate.cv, baseline.cv);
    await assert.rejects(renderDossierDocx(candidate), /paragraph frame pagination is unaccepted/);
    const pack = async (model: typeof candidate) =>
      new Uint8Array(await (await renderDossierDocx(model, renderOptions)).arrayBuffer());
    const bytes = await pack(candidate);
    assert.deepEqual(bytes, await pack(JSON.parse(JSON.stringify(candidate))));
    assert.equal(JSON.stringify(input), before);
    await writeFile(path.join(dir, "baseline.docx"), await pack(baseline));
    await writeFile(path.join(dir, "candidate.docx"), bytes);
    await writeFile(path.join(dir, "snapshot.json"), JSON.stringify(input, null, 2));
    await writeFile(path.join(dir, "model.json"), JSON.stringify(candidate, null, 2));
    evidence.push({
      name,
      candidateSha256: hash(bytes),
      neighborModelsIdentical: true,
      sourceImmutable: true,
      jsonPackageIdentical: true,
      productionRenderGuard: true,
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  path.join(out, "generation.json"),
  JSON.stringify(
    { cases: evidence, wordVisualAcceptance: "UNVERIFIED", all39: "NOT RUN" },
    null,
    2,
  ),
);
console.log(JSON.stringify(evidence));
