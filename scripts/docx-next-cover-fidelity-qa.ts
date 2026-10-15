import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { renderDossierDocx, type RenderOptions } from "../src/lib/docx-next/renderer";
import { walkBlocks } from "../src/lib/docx-next/model";
import { NEXT_TEMPLATES } from "../src/lib/docx-next/templates";
import { graphicCandidateFixture } from "../tests/fixtures/docx-next/graphic-candidate";

if (!existsSync("src/lib/docx-next/cover-regions.ts"))
  throw new Error("Apply the documented rejected-experiment patch in an isolated checkout first.");
const directory = process.argv[2];
if (!directory) throw new Error("Usage: bun scripts/docx-next-cover-fidelity-qa.ts OUTPUT");
await mkdir(directory, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.DOCX_QA_PLAYWRIGHT ?? "playwright");
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
const bundle = await Bun.build({
  entrypoints: ["src/lib/docx-next/decoration.ts"],
  target: "browser",
  format: "esm",
});
assert(bundle.success);
const code = await bundle.outputs[0].text();
const cache = new Map();
const options: RenderOptions = {
  allowUnacceptedModelIssues: true,
  rasterizeDecoration: async (paint) => {
    const key = JSON.stringify(paint);
    if (!cache.has(key)) {
      const result = await page.evaluate(
        async ({ paint, code }) => {
          const module = await import("data:text/javascript;base64," + btoa(code));
          const asset = await module.rasterizeDecoration(paint);
          return { ...asset, bytes: Array.from(asset.bytes) };
        },
        { paint, code },
      );
      cache.set(key, { ...result, bytes: Uint8Array.from(result.bytes) });
    }
    return cache.get(key);
  },
};
const hash = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const text = (model: ReturnType<typeof buildDossierDocModel>) =>
  walkBlocks(model.cover.blocks)
    .filter((b) => b.kind === "paragraph")
    .map((b) => ({
      id: b.id,
      text: b.runs.map((r) => r.text).join(""),
      fields: b.runs.map((r) => r.fieldId),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
const rows = [];
try {
  for (const id of Object.keys(NEXT_TEMPLATES)) {
    const source = graphicCandidateFixture(id);
    const snapshot = JSON.stringify(source);
    const base = buildDossierDocModel(source);
    const candidate = buildDossierDocModel(source, { coverComposition: "authored-regions" });
    assert.deepEqual(candidate.letter, base.letter);
    assert.deepEqual(candidate.cv, base.cv);
    assert.deepEqual(text(candidate), text(base));
    assert.deepEqual(
      candidate,
      buildDossierDocModel(JSON.parse(snapshot), { coverComposition: "authored-regions" }),
    );
    await assert.rejects(renderDossierDocx(candidate), /authored cover regions are unaccepted/);
    const before = new Uint8Array(await (await renderDossierDocx(base, options)).arrayBuffer());
    const after = new Uint8Array(await (await renderDossierDocx(candidate, options)).arrayBuffer());
    const restored = new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(candidate)), options)).arrayBuffer(),
    );
    assert.deepEqual(after, restored);
    assert.equal(JSON.stringify(source), snapshot);
    await writeFile(path.join(directory, id + "-before.docx"), before);
    await writeFile(path.join(directory, id + "-candidate.docx"), after);
    const regions = candidate.cover.blocks
      .filter((b) => b.kind === "table" && b.pageRegion)
      .map((b) => ({ id: b.id, widthMm: b.widthMm, ...b.pageRegion }));
    rows.push({
      id,
      structural: "PASS",
      neighborModels: "IDENTICAL",
      semanticFields: "IDENTICAL",
      restoredPackage: "IDENTICAL",
      beforeSha256: hash(before),
      candidateSha256: hash(after),
      regions,
    });
  }
  await writeFile(
    path.join(directory, "matrix.json"),
    JSON.stringify(
      {
        base: "8901a830a792d75e9e792345c5180827218b4e1e",
        status: "STRUCTURAL ONLY — native visual and desktop Word acceptance are separate",
        templates: rows,
        packageGenerations: rows.length * 3,
        decorativeAssets: cache.size,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      templates: rows.length,
      packageGenerations: rows.length * 3,
      decorativeAssets: cache.size,
      structural: "PASS",
      word: "UNVERIFIED",
    }),
  );
} finally {
  await browser.close();
}
