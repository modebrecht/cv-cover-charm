import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { readZipEntries } from "../src/lib/docx-next/zip";
import {
  SIDEBAR_FLOATING_CONTINUATION_CASES,
  sidebarFloatingContinuationFixture,
} from "../tests/fixtures/docx-next/sidebar-floating-continuation";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-floating-continuation-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const option = { allowUnacceptedModelIssues: true };
const compatibility =
  '<w:compatSetting w:name="allowTextAfterFloatingTableBreak" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>';
const manifest = [];
for (const value of SIDEBAR_FLOATING_CONTINUATION_CASES) {
  const { model, fixture } = sidebarFloatingContinuationFixture(value);
  const before = structuredClone(model),
    restored = JSON.parse(JSON.stringify(model));
  await assert.rejects(renderDossierDocx(model), /floating table .*unaccepted/);
  await assert.rejects(renderDossierDocx(restored), /floating table .*unaccepted/);
  const bytes = new Uint8Array(await (await renderDossierDocx(model, option)).arrayBuffer());
  assert.deepEqual(
    bytes,
    new Uint8Array(await (await renderDossierDocx(restored, option)).arrayBuffer()),
  );
  assert.deepEqual(model, before);
  const control = sidebarFloatingContinuationFixture({ ...value, policy: "default" }).model;
  const normalized = structuredClone(model);
  delete normalized.floatingTableTextFlow;
  assert.deepEqual(normalized, control);
  const controlBytes = new Uint8Array(
    await (await renderDossierDocx(control, option)).arrayBuffer(),
  );
  const entries = readZipEntries(bytes),
    originals = readZipEntries(controlBytes);
  assert.deepEqual(
    entries.map((row) => row.name),
    originals.map((row) => row.name),
  );
  for (let index = 0; index < entries.length; index++) {
    const current = entries[index],
      original = originals[index];
    if (current.name === "word/settings.xml" && value.policy === "all-pages") {
      const settings = new TextDecoder().decode(current.bytes);
      assert.equal(settings.split(compatibility).length, 2);
      assert.equal(settings.replace(compatibility, ""), new TextDecoder().decode(original.bytes));
    } else assert.deepEqual(current.bytes, original.bytes);
  }
  const docxSha256 = createHash("sha256").update(bytes).digest("hex");
  manifest.push({ ...value, docxSha256 });
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "floating-continuation-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Twelve guarded sources; only the declared settings element changes; whole stories and immutable JSON verified.",
);
