import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { paragraph } from "../src/lib/docx-next/native-text";
import { walkBlocks } from "../src/lib/docx-next/model";
import { readZipEntries } from "../src/lib/docx-next/zip";
import {
  SIDEBAR_CONTROL_PLACEMENT_CASES,
  sidebarControlPlacementFixture,
} from "../tests/fixtures/docx-next/sidebar-control-placement";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-control-placement-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const previous = JSON.parse(
  await readFile("docs/docx-next/sidebar-carrier-story-evidence.json", "utf8"),
);
const manifest = [];
for (const value of SIDEBAR_CONTROL_PLACEMENT_CASES) {
  const { model, control, fixture } = sidebarControlPlacementFixture(value);
  const originalModel = structuredClone(model);
  const options = { allowUnacceptedModelIssues: true };
  await assert.rejects(renderDossierDocx(model), /unaccepted/);
  const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
  const original = new Uint8Array(await (await renderDossierDocx(control, options)).arrayBuffer());
  assert.deepEqual(
    bytes,
    new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
    ),
  );
  assert.deepEqual(model, originalModel);
  const old = previous.stable.preparedSources.find(
    (row: { name: string }) =>
      row.name === value.name.replace("control-placement", "carrier-story"),
  );
  const hash = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
  assert.equal(hash(original), old.docxSha256);
  const before = readZipEntries(original),
    after = readZipEntries(bytes);
  assert.deepEqual(
    after.map((entry) => entry.name),
    before.map((entry) => entry.name),
  );
  const originalParagraph = walkBlocks(control.cv.blocks).find(
    (block) => block.id === fixture.changedControlId,
  );
  const changedParagraph = walkBlocks(model.cv.blocks).find(
    (block) => block.id === fixture.changedControlId,
  );
  assert(originalParagraph?.kind === "paragraph" && changedParagraph?.kind === "paragraph");
  for (let i = 0; i < before.length; i++) {
    if (before[i].name !== "word/document.xml") assert.deepEqual(before[i].bytes, after[i].bytes);
    else {
      const source = new TextDecoder().decode(before[i].bytes);
      const from = paragraph(originalParagraph),
        to = paragraph(changedParagraph);
      assert.equal(source.split(from).length, 2);
      assert.equal(source.replace(from, to), new TextDecoder().decode(after[i].bytes));
    }
  }
  manifest.push({
    ...value,
    changedControlId: fixture.changedControlId,
    docxSha256: hash(bytes),
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
  path.join(directory, "control-placement-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Six guarded sources; only first complete control placement changes. Native execution stops at first failure.",
);
