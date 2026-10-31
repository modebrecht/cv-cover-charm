/** Three real DOCX Next renderer outputs; no fabricated XML or saved-package repairs. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { renderDossierDocx, type RenderOptions } from "../src/lib/docx-next/renderer";
import { readZipEntries } from "../src/lib/docx-next/zip";
import { sidebarFixture, type SidebarFixture } from "../tests/fixtures/docx-next/sidebar";

const [output] = process.argv.slice(2);
assert(
  output && process.argv.length === 3,
  "Usage: bun scripts/docx-next-onlyoffice-sources.ts NEW_OUTPUT",
);
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const fixturePath = "tests/fixtures/docx-next/picture-import/app-body-photo-free-main.docx";
const fixture = new Uint8Array(await readFile(fixturePath));
assert.equal(sha(fixture), "7dd758c90f92d5a490ef022923c738edff042c539aa578e451aa1909bcd81923");
const photo = readZipEntries(fixture).find(
  (entry) => entry.name === "word/media/image-1.png",
)!.bytes;
assert.equal(sha(photo), "77aa2ffea44e66b004db2ce62dd50607cdf506f97202772528b74148893e9e42");
const image = `data:image/png;base64,${Buffer.from(photo).toString("base64")}`;
const view = new DataView(photo.buffer, photo.byteOffset, photo.byteLength);
const normalizeImage = async (source: string) => {
  assert.equal(source, image);
  return {
    bytes: photo,
    widthPx: view.getUint32(16),
    heightPx: view.getUint32(20),
    extension: "png" as const,
    contentType: "image/png" as const,
  };
};
const definitions: {
  id: string;
  kind: SidebarFixture;
  expectedPhoto: boolean;
  options?: RenderOptions;
}[] = [
  { id: "01-normal", kind: "left", expectedPhoto: false },
  { id: "02-inline-photo", kind: "photo-left", expectedPhoto: true },
  {
    id: "03-word-free-photo",
    kind: "photo-free-main",
    expectedPhoto: true,
    options: {
      allowUnacceptedModelIssues: true,
      directPictureOwnership: true,
      directPictureVariant: "rich-text",
    },
  },
];
await mkdir(output, { recursive: false });
const cases = [];
for (const spec of definitions) {
  const diagnostic = spec.options !== undefined;
  const model = buildDossierDocModel(
    sidebarFixture(spec.kind, image),
    diagnostic
      ? {
          cvSidebarComposition: "body-stories",
          chromeFirstPageIdentity: "distinct-stories",
        }
      : {},
  );
  const before = structuredClone(model);
  const render = async () =>
    new Uint8Array(
      await (await renderDossierDocx(model, { normalizeImage, ...spec.options })).arrayBuffer(),
    );
  const bytes = await render();
  assert.deepEqual(await render(), bytes, "Renderer output must be deterministic");
  assert.deepEqual(model, before, "Source model must remain unchanged");
  const file = spec.id + ".docx";
  await writeFile(path.join(output, file), bytes);
  cases.push({
    id: spec.id,
    file,
    sha256: sha(bytes),
    expectedPhoto: spec.expectedPhoto,
    diagnostic,
    fixture: spec.kind,
    options: spec.options ?? {},
  });
}
await writeFile(
  path.join(output, "manifest.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      sourceCommit,
      generatorSha256: sha(new Uint8Array(await readFile(import.meta.filename))),
      fixtureSha256: sha(fixture),
      cases,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(cases));
