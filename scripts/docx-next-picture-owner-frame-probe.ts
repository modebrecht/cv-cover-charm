/** Compare the unchanged framed renderer with its rejected direct-picture experiment. */
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
const name = "app-body-photo-free-main";
const fixture = JSON.parse(await readFile(path.join(fixtures, name + ".json"), "utf8"));
const images = JSON.parse(await readFile(path.join(fixtures, "images.json"), "utf8"));
const bytes = new Uint8Array(await readFile(path.join(fixtures, "normalized-icc-jpeg.png")));
assert.equal(Buffer.from(bytes.subarray(0, 8)).toString("hex"), "89504e470d0a1a0a");
const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const input = sidebarFixture("photo-free-main", images["icc-jpeg"]);
const model = buildDossierDocModel(input, {
  cvSidebarComposition: "body-stories",
  chromeFirstPageIdentity: "distinct-stories",
});
const before = structuredClone(model);
const normalizeImage = async (source: string) => {
  assert.equal(source, images["icc-jpeg"], "No substitute image source allowed");
  return {
    bytes,
    widthPx: view.getUint32(16),
    heightPx: view.getUint32(20),
    extension: "png" as const,
    contentType: "image/png" as const,
  };
};
const render = async (directPictureOwnership: boolean) =>
  new Uint8Array(
    await (
      await renderDossierDocx(model, {
        normalizeImage,
        allowUnacceptedModelIssues: true,
        directPictureOwnership,
      })
    ).arrayBuffer(),
  );
const framed = await render(false);
const direct = await render(true);
assert.deepEqual(model, before);
const actual = new Uint8Array(await readFile(path.join(fixtures, name + ".docx")));
assert.deepEqual(actual, fixture.directPictureOwnership ? direct : framed);
for (const part of readZipEntries(framed).filter((part) => part.name !== "word/document.xml"))
  assert.deepEqual(
    readZipEntries(direct).find((current) => current.name === part.name),
    part,
  );
const sha = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
await mkdir(output, { recursive: true });
await writeFile(path.join(output, name + ".docx"), direct);
await writeFile(path.join(output, "legacy-frame.docx"), framed);
await writeFile(
  path.join(output, name + ".json"),
  JSON.stringify({ ...fixture, directPictureOwnership: true, sourceSha256: sha(direct) }, null, 2) +
    "\n",
);
console.log(
  JSON.stringify({
    framedSha256: sha(framed),
    directSha256: sha(direct),
    appSourceByteIdentity: true,
  }),
);
