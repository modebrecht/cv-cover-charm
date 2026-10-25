import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { control, emptyParagraph } from "../src/lib/docx-next/native-text";
import { readZipEntries } from "../src/lib/docx-next/zip";
import {
  CONTAINER_IDENTITY_CASES,
  containerIdentityFixture,
} from "../tests/fixtures/docx-next/sidebar-container-identity";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-container-identity-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const previous = JSON.parse(
  await readFile("docs/docx-next/sidebar-picture-identity-evidence.json", "utf8"),
);
const manifest = [];
for (const value of CONTAINER_IDENTITY_CASES) {
  const { model, fixture } = containerIdentityFixture(value);
  const control = containerIdentityFixture({ ...value, carrier: "caption-only" });
  const comparable = structuredClone(model);
  const table = comparable.cv.blocks[0];
  assert(table.kind === "table");
  delete table.identityCarrier;
  assert.deepEqual(comparable, control.model);
  assert.deepEqual(fixture.fields, control.fixture.fields);
  const before = structuredClone(model);
  const restored = JSON.parse(JSON.stringify(model));
  await assert.rejects(renderDossierDocx(model), /unaccepted/);
  await assert.rejects(renderDossierDocx(restored), /unaccepted/);
  const options = { allowUnacceptedModelIssues: true };
  const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
  const restoredBytes = new Uint8Array(
    await (await renderDossierDocx(restored, options)).arrayBuffer(),
  );
  assert.deepEqual(bytes, restoredBytes);
  assert.deepEqual(model, before);
  assert.deepEqual(restored, before);
  const docxSha256 = createHash("sha256").update(bytes).digest("hex");
  if (value.carrier === "caption-only") {
    const old = previous.stable.fixtures.find(
      (row: { fixture: string }) => row.fixture === fixture.originalName,
    );
    assert(old, "Missing independently executed plain control");
    assert.equal(docxSha256, old.sourceDocxSha256);
  } else {
    const originalBytes = new Uint8Array(
      await (await renderDossierDocx(control.model, options)).arrayBuffer(),
    );
    const originalParts = readZipEntries(originalBytes);
    const currentParts = readZipEntries(bytes);
    assert.deepEqual(
      currentParts.map((part) => part.name),
      originalParts.map((part) => part.name),
    );
    for (const [index, part] of currentParts.entries()) {
      if (part.name === "word/document.xml") {
        const content = new TextDecoder().decode(part.bytes);
        const carrier = controlTag(fixture.tableId);
        assert.equal(content.split(carrier).length, 2);
        assert.equal(
          content.replace(carrier, emptyParagraph),
          new TextDecoder().decode(originalParts[index].bytes),
        );
      } else assert.deepEqual(part.bytes, originalParts[index].bytes);
    }
  }
  manifest.push({ ...fixture, docxSha256 });
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
}
await writeFile(
  path.join(directory, "container-identity-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log("Six guarded no-photo controls; original plain packages and immutable JSON verified.");

function controlTag(id: string) {
  return control(id, emptyParagraph);
}
