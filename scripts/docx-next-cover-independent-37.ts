/** Bounded Brief feasibility probe. No production builder/renderer switch. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sidebarFixture } from "../tests/fixtures/docx-next/sidebar";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { walkBlocks, type DossierDocModel, type Paragraph } from "../src/lib/docx-next/model";
import { readZipEntries } from "../src/lib/docx-next/zip";
import { resolveLayout } from "../src/components/cover/resolve";
import type { DossierAppSnapshot } from "../src/lib/docx-next/source";

const out = process.argv[2];
const originalPath = process.argv[3];
if (!out || !originalPath)
  throw Error("Usage: bun scripts/docx-next-cover-independent-37.ts OUTPUT ORIGINAL_DOCX");
await mkdir(out, { recursive: true });
const hash = (v: Uint8Array | string) => createHash("sha256").update(v).digest("hex");
const original = readZipEntries(new Uint8Array(await readFile(originalPath)));
const image = original.find((e) => e.name === "word/media/image-1.png")!.bytes;
const source = "data:image/png;base64," + Buffer.from(image).toString("base64");
const input = sidebarFixture("photo-right", source);
// Reuse the historical fixture; do not change or investigate its frozen CV composition.
const options = {
  cvSidebarComposition: "body-stories" as const,
  chromeFirstPageIdentity: "distinct-stories" as const,
};
const baseline = buildDossierDocModel(input, options);
const rendering = {
  allowUnacceptedModelIssues: true,
  normalizeImage: async () => ({
    bytes: image,
    widthPx: new DataView(image.buffer, image.byteOffset).getUint32(16),
    heightPx: new DataView(image.buffer, image.byteOffset).getUint32(20),
    contentType: "image/png" as const,
    extension: "png" as const,
  }),
};
const signature = (model: DossierDocModel) =>
  walkBlocks(model.cover.blocks)
    .filter((b): b is Paragraph => b.kind === "paragraph")
    .map((b) => ({ id: b.id, runs: b.runs }))
    .sort((a, b) => a.id.localeCompare(b.id));

/** Reuse existing authored anchor resolver and existing native auto-height frames.
 * This server-side resolver has no canvas: wrapping/auto-fit are explicitly NOT proven.
 * CSS, placeholder pictures and text-box paint are NOT silently imported from DOM.
 */
function candidate(snapshot: DossierAppSnapshot, base: DossierDocModel): DossierDocModel {
  const model = structuredClone(base);
  const positions = resolveLayout(snapshot.cover.blocks, snapshot.cover.fontScale);
  const aliases: Record<string, string> = { name: "fullName", beruf: "profession", foto: "photo" };
  const paragraphs = walkBlocks(base.cover.blocks).filter(
    (b): b is Paragraph => b.kind === "paragraph",
  );
  model.cover.blocks = [];
  for (const block of snapshot.cover.blocks) {
    if (block.style.hidden) continue;
    const id = "cover." + (aliases[block.id] ?? block.id);
    const content = paragraphs.filter((p) => p.id === id || p.id.startsWith(id + "."));
    if (!content.length) continue;
    assert.equal(block.kind, "text", "This bounded probe accepts text-only Brief fields");
    assert(
      !block.src && !block.style.bg && !(block.style.borderWidth ?? 0),
      "Paint needs a separate proven contract",
    );
    const { y, height } = positions[block.id];
    assert(
      block.style.x >= 0 && y >= 0 && block.style.x + block.style.w <= 210 && y + height <= 297,
      `Out of A4: ${id}`,
    );
    model.cover.blocks.push({
      kind: "paragraph-frame",
      id: id + ".frame",
      xMm: block.style.x,
      yMm: y,
      widthMm: block.style.w,
      paragraphs: content.map((p) => ({
        ...p,
        beforeMm: 0,
        afterMm: 0,
        keepNext: false,
        keepLines: true,
      })),
    });
  }
  assert.deepEqual(signature(model), signature(base));
  assert.deepEqual(model.letter, base.letter);
  assert.deepEqual(model.cv, base.cv);
  return model;
}

const snapshotBefore = JSON.stringify(input);
const before = new Uint8Array(await (await renderDossierDocx(baseline, rendering)).arrayBuffer());
const afterModel = candidate(input, baseline);
await assert.rejects(renderDossierDocx(afterModel), /paragraph frame pagination is unaccepted/);
const after = new Uint8Array(await (await renderDossierDocx(afterModel, rendering)).arrayBuffer());
assert.deepEqual(
  after,
  new Uint8Array(
    await (
      await renderDossierDocx(JSON.parse(JSON.stringify(afterModel)), rendering)
    ).arrayBuffer(),
  ),
);
assert.equal(JSON.stringify(input), snapshotBefore);

// A relevant authored move/style is retained in a second Brief-only package.
const moved = structuredClone(input);
const date = moved.cover.blocks.find((b) => b.id === "ortDatum")!;
Object.assign(date.style, {
  x: 105,
  y: 28,
  w: 85,
  above: null,
  follows: null,
  anchorBottom: false,
  align: "right",
  size: 10,
});
const movedModel = candidate(moved, buildDossierDocModel(moved, options));
const movedFrame = movedModel.cover.blocks.find((b) => b.id === "cover.ortDatum.frame");
assert(movedFrame?.kind === "paragraph-frame");
assert.equal(movedFrame.yMm, 28);
assert.equal(movedFrame.paragraphs[0].runs[0].style.sizePt, 10);

const beforeParts = readZipEntries(before);
const coverXml = (parts: typeof original) =>
  new TextDecoder()
    .decode(parts.find((e) => e.name === "word/document.xml")!.bytes)
    .split("<w:p><w:pPr><w:sectPr>")[0];
const modelEvidence = {
  scope: "Brief only; existing paragraph-frame primitive; not accepted production output",
  originalSha256: hash(new Uint8Array(await readFile(originalPath))),
  originalCoverPrefixIdentical: coverXml(original) === coverXml(beforeParts),
  originalCoverPrefixSha256: hash(coverXml(original)),
  reproducedCoverPrefixSha256: hash(coverXml(beforeParts)),
  baselineSha256: hash(before),
  candidateSha256: hash(after),
  paragraphSignatureIdentical: true,
  neighborModelsIdentical: true,
  sourceImmutable: true,
  jsonPackageIdentical: true,
  frames: afterModel.cover.blocks,
  sourceBlocks: input.cover.blocks,
  unresolved: [
    "Desktop Word visual/edit/Save-Reopen",
    "CSS typography and footer label normalization",
    "Canvas-dependent auto-fit/wrapping",
    "Null-photo initials placeholder",
    "Overflow and collisions after editing",
    "All other templates and stress scenarios",
  ],
};
await writeFile(path.join(out, "brief-baseline.docx"), before);
await writeFile(path.join(out, "brief-frame-probe.docx"), after);
await writeFile(
  path.join(out, "brief-moved-date-probe.docx"),
  new Uint8Array(await (await renderDossierDocx(movedModel, rendering)).arrayBuffer()),
);
await writeFile(path.join(out, "snapshot.json"), JSON.stringify(input, null, 2));
await writeFile(path.join(out, "model-evidence.json"), JSON.stringify(modelEvidence, null, 2));
console.log(
  JSON.stringify({
    ...modelEvidence,
    frames: afterModel.cover.blocks.length,
    sourceBlocks: input.cover.blocks.length,
  }),
);
