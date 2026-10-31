/** Rebuild four real app sources and a guarded Rich Text owner trial; no saved-package repair. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { readZipEntries } from "../src/lib/docx-next/zip";
import { sidebarFixture } from "../tests/fixtures/docx-next/sidebar";

const [fixtures, output] = process.argv.slice(2);
assert(fixtures && output && process.argv.length === 4);
const images = JSON.parse(await readFile(path.join(fixtures, "images.json"), "utf8"));
const bytes = new Uint8Array(await readFile(path.join(fixtures, "normalized-icc-jpeg.png")));
assert.equal(Buffer.from(bytes.subarray(0, 8)).toString("hex"), "89504e470d0a1a0a");
const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const normalizeImage = async (source: string) => {
  assert.equal(source, images["icc-jpeg"]);
  return {
    bytes,
    widthPx: view.getUint32(16),
    heightPx: view.getUint32(20),
    extension: "png" as const,
    contentType: "image/png" as const,
  };
};
const sha = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
await mkdir(output, { recursive: true });
const manifest = [];
for (const kind of [
  "photo-free-main",
  "photo-free-low",
  "photo-free-portrait",
  "photo-free-chrome",
] as const) {
  const name = `app-body-${kind}`;
  const fixture = JSON.parse(await readFile(path.join(fixtures, name + ".json"), "utf8"));
  const source = new Uint8Array(await readFile(path.join(fixtures, name + ".docx")));
  assert.equal(sha(source), fixture.sourceSha256);
  assert.equal(fixture.directPictureOwnership, true);
  const model = buildDossierDocModel(sidebarFixture(kind, images["icc-jpeg"]), {
    cvSidebarComposition: "body-stories",
    chromeFirstPageIdentity: "distinct-stories",
  });
  const before = structuredClone(model);
  const render = async (directPictureVariant: "picture" | "rich-text" | "rich-text-tile") =>
    new Uint8Array(
      await (
        await renderDossierDocx(model, {
          normalizeImage,
          allowUnacceptedModelIssues: true,
          directPictureOwnership: true,
          directPictureVariant,
        })
      ).arrayBuffer(),
    );
  assert.deepEqual(await render("picture"), source, "The real app source must reconstruct exactly");
  const candidate = await render("rich-text");
  assert.deepEqual(await render("rich-text"), candidate, "Nondeterministic candidate");
  assert.deepEqual(model, before);
  const originalParts = readZipEntries(source);
  for (const part of readZipEntries(candidate)) {
    const original = originalParts.find((entry) => entry.name === part.name)!;
    if (part.name === "word/document.xml")
      assert.equal(
        new TextDecoder().decode(part.bytes),
        new TextDecoder().decode(original.bytes).replace("<w:picture/>", ""),
      );
    else assert.deepEqual(part, original);
  }
  await writeFile(path.join(output, name + "-rich.docx"), candidate);
  const tiled = await render("rich-text-tile");
  assert.deepEqual(await render("rich-text-tile"), tiled);
  const richParts = readZipEntries(candidate);
  for (const part of readZipEntries(tiled)) {
    const original = richParts.find((entry) => entry.name === part.name)!;
    if (part.name !== "word/document.xml") assert.deepEqual(part, original);
    else {
      const richXml = new TextDecoder().decode(original.bytes);
      const tileXml = new TextDecoder().decode(part.bytes);
      const owner = /<w:sdt><w:sdtPr><w:alias w:val="cv.person.photo"\/>[\s\S]*?<\/w:sdt>/g;
      const richOwner = richXml.match(owner),
        tileOwner = tileXml.match(owner);
      assert.equal(richOwner?.length, 1);
      assert.equal(tileOwner?.length, 1);
      assert.equal(tileXml, richXml.replace(richOwner![0], tileOwner![0]));
      assert.match(tileOwner![0], /<a:tile\b/);
      assert.match(tileOwner![0], /<w:vanish\/>/);
      assert.doesNotMatch(tileOwner![0], /<pic:pic>|<w:picture\/>|<w:txbxContent>/);
    }
  }
  assert.deepEqual(model, before);
  await writeFile(path.join(output, name + "-tile.docx"), tiled);
  manifest.push({
    fixture: name,
    sourceSha256: sha(source),
    candidateSha256: sha(candidate),
    tiledCandidateSha256: sha(tiled),
    sourceReconstructionByteExact: true,
    onlyOwnerTypeChanged: true,
    controlType: "rich-text",
    tiledVariant: "filled shape with explicit 96 DPI tile and one hidden leading ZWSP",
    productionAcceptance: "blocked",
  });
}
await writeFile(
  path.join(output, "renderer-rich-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(JSON.stringify(manifest));
