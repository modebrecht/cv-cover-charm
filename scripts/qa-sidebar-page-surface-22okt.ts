/** Internal same-input regression; not a new user Word acceptance packet. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { readZipEntries } from "../src/lib/docx-next/zip";
import { sidebarFixture } from "../tests/fixtures/docx-next/sidebar";
const [outputArg, photoArg, baselineArg] = process.argv.slice(2);
if (!outputArg || !photoArg || !baselineArg)
  throw Error(
    "Usage: bun scripts/qa-sidebar-page-surface-22okt.ts OUTPUT ORIGINAL_PHOTO.png VERIFIED_BASELINE_DIRECTORY",
  );
const out = path.resolve(outputArg);
await mkdir(out, { recursive: true });
const { buildDossierDocModel: baselineBuild } = await import(
  path.join(path.resolve(baselineArg), "src/lib/docx-next/build-model.ts")
);
const bytes = new Uint8Array(await readFile(path.resolve(photoArg)));
const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const options = {
  cvSidebarComposition: "body-stories" as const,
  chromeFirstPageIdentity: "distinct-stories" as const,
};
const renderOptions = {
  allowUnacceptedModelIssues: true,
  normalizeImage: async () => ({
    bytes,
    widthPx: view.getUint32(16),
    heightPx: view.getUint32(20),
    contentType: "image/png",
    extension: "png" as const,
  }),
};
const inputs = [
  ["01-left-short", sidebarFixture("left")],
  ["02-right-photo", sidebarFixture("photo-right", "original-photo")],
  ["03-right-continuation", sidebarFixture("chrome-continuation")],
] as const;
inputs[2][1].settings.sidebarSide = "right";
inputs[2][1].cv.data.schule = inputs[2][1].cv.data.schule.slice(0, 16);
const manifest = [];
for (const [id, input] of inputs) {
  const saved = structuredClone(input),
    before = baselineBuild(input, options),
    after = buildDossierDocModel(input, options);
  assert.deepEqual(input, saved);
  const withoutPaint = structuredClone(after);
  withoutPaint.cv.artwork = withoutPaint.cv.artwork.filter(
    (a) => !a.id.startsWith("cv.artwork.sidebar-"),
  );
  assert.deepEqual(withoutPaint, before, "Only page paint may change");
  const outputs: any = {};
  for (const [kind, model] of [
    ["before", before],
    ["after", after],
  ] as const) {
    const docx = new Uint8Array(
      await (await renderDossierDocx(model, renderOptions)).arrayBuffer(),
    );
    const entries = readZipEntries(docx);
    outputs[kind] = entries;
    await writeFile(path.join(out, id + "-" + kind + ".docx"), docx);
    await writeFile(
      path.join(out, id + "-" + kind + "-model.json"),
      JSON.stringify(model, null, 2),
    );
  }
  const originalParts = outputs.before as ReturnType<typeof readZipEntries>,
    newParts = outputs.after as ReturnType<typeof readZipEntries>;
  const byName = new Map(newParts.map((p) => [p.name, p.bytes]));
  const unchanged = [];
  for (const part of originalParts) {
    if (
      part.name === "word/document.xml" ||
      /word\/(cover|letter)-/.test(part.name) ||
      part.name.startsWith("word/media/image")
    ) {
      assert.deepEqual(
        byName.get(part.name),
        part.bytes,
        "Changed semantic/picture/chrome part " + part.name,
      );
      unchanged.push(part.name);
    }
  }
  const photoEmbedded =
    !id.includes("photo") || newParts.some((p) => Buffer.from(p.bytes).equals(Buffer.from(bytes)));
  assert(photoEmbedded);
  const r = {
    id,
    sourceStatePreserved: true,
    onlyPageArtworkModelChanged: true,
    documentXmlIdentical: true,
    unchangedParts: unchanged,
    originalPhotoEmbedded: photoEmbedded,
    surface: after.cv.artwork.filter((a) => a.id.startsWith("cv.artwork.sidebar-")),
  };
  manifest.push(r);
  await writeFile(path.join(out, id + "-input.json"), JSON.stringify(input, null, 2));
  console.log(id, "PASS");
}
await writeFile(
  path.join(out, "manifest.json"),
  JSON.stringify(
    {
      sourceRef: "f73c776e2eca6b9b0d858ee2ab997230259797ac",
      sourcePhotoSha256: createHash("sha256").update(bytes).digest("hex"),
      scope: "Internal shared-exporter diagnostics; no application PDF or Desktop Word acceptance",
      results: manifest,
    },
    null,
    2,
  ),
);
