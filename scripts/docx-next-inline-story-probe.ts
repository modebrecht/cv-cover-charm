import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { readZipEntries } from "../src/lib/docx-next/zip";
import {
  SIDEBAR_INLINE_STORY_CASES,
  sidebarInlineStoryFixture,
} from "../tests/fixtures/docx-next/sidebar-inline-story";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-inline-story-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const previous = JSON.parse(
  await readFile("docs/docx-next/sidebar-floating-continuation-evidence.json", "utf8"),
);
const manifest = [];
for (const value of SIDEBAR_INLINE_STORY_CASES) {
  const { model, control, fixture } = sidebarInlineStoryFixture(value);
  const before = structuredClone(model),
    restored = JSON.parse(JSON.stringify(model));
  await assert.rejects(renderDossierDocx(model), /floating table .*unaccepted/);
  await assert.rejects(renderDossierDocx(restored), /floating table .*unaccepted/);
  const option = { allowUnacceptedModelIssues: true };
  const bytes = new Uint8Array(await (await renderDossierDocx(model, option)).arrayBuffer());
  const controlBytes = new Uint8Array(
    await (await renderDossierDocx(control, option)).arrayBuffer(),
  );
  assert.deepEqual(
    bytes,
    new Uint8Array(await (await renderDossierDocx(restored, option)).arrayBuffer()),
  );
  assert.deepEqual(model, before);
  const hash = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
  const controlName = `floating-continuation-${value.orientation}-${value.kind}-all-pages`;
  const old = previous.devCli.preparedSources.find(
    (row: { name: string }) => row.name === controlName,
  );
  assert(old);
  assert.equal(hash(controlBytes), old.docxSha256);
  const entries = readZipEntries(bytes),
    controls = readZipEntries(controlBytes);
  assert.deepEqual(
    entries.map((entry) => entry.name),
    controls.map((entry) => entry.name),
  );
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].name !== "word/document.xml")
      assert.deepEqual(entries[i].bytes, controls[i].bytes);
  }
  const docxSha256 = hash(bytes);
  manifest.push({ ...value, docxSha256, controlName, controlDocxSha256: old.docxSha256 });
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
  await writeFile(path.join(directory, value.name + "-control.docx"), controlBytes);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "inline-story-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Six guarded complete inline-story sources; original nested blocks and all non-document package bytes unchanged.",
);
