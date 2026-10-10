import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { readZipEntries } from "../src/lib/docx-next/zip";
import { emptyParagraph } from "../src/lib/docx-next/native-text";
import {
  SIDEBAR_OWNER_BOUNDARY_CASES,
  sidebarOwnerBoundaryFixture,
} from "../tests/fixtures/docx-next/sidebar-owner-boundary";
const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-owner-boundary-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const previous = JSON.parse(
  await readFile("docs/docx-next/sidebar-carrier-story-evidence.json", "utf8"),
);
const manifest = [];
for (const value of SIDEBAR_OWNER_BOUNDARY_CASES) {
  const { model, control, fixture } = sidebarOwnerBoundaryFixture(value);
  const before = structuredClone(model),
    options = { allowUnacceptedModelIssues: true };
  await assert.rejects(renderDossierDocx(model), /floating table .*unaccepted/);
  await assert.rejects(
    renderDossierDocx(JSON.parse(JSON.stringify(model))),
    /floating table .*unaccepted/,
  );
  const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
  assert.deepEqual(
    bytes,
    new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
    ),
  );
  assert.deepEqual(model, before);
  const original = new Uint8Array(await (await renderDossierDocx(control, options)).arrayBuffer());
  const hash = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
  const controlName = value.name.replace("owner-boundary", "carrier-story");
  const old = previous.stable.preparedSources.find(
    (row: { name: string }) => row.name === controlName,
  );
  assert(old);
  assert.equal(hash(original), old.docxSha256);
  const entries = readZipEntries(bytes),
    originals = readZipEntries(original);
  assert.deepEqual(
    entries.map((e) => e.name),
    originals.map((e) => e.name),
  );
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].name !== "word/document.xml")
      assert.deepEqual(entries[i].bytes, originals[i].bytes);
    else {
      const source = new TextDecoder().decode(originals[i].bytes),
        current = new TextDecoder().decode(entries[i].bytes);
      const start = "<w:tbl><w:tblPr><w:tblpPr";
      assert.equal(source.split(start).length, 2);
      assert.equal(source.replace(start, emptyParagraph + start), current);
    }
  }
  manifest.push({
    ...value,
    docxSha256: hash(bytes),
    controlName,
    controlDocxSha256: hash(original),
  });
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
  await writeFile(path.join(directory, value.name + "-control.docx"), original);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "owner-boundary-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Six guarded owner-boundary candidates; all original carrier bytes and non-document parts verified.",
);
