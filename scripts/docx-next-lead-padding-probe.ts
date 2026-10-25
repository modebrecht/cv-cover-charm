import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  SIDEBAR_LEAD_PADDING_CASES,
  sidebarLeadPaddingFixture,
} from "../tests/fixtures/docx-next/sidebar-lead-padding";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-lead-padding-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
for (const value of SIDEBAR_LEAD_PADDING_CASES) {
  const { model, fixture } = sidebarLeadPaddingFixture(value);
  const control = sidebarLeadPaddingFixture({ ...value, leadRepresentation: "paragraph" });
  const comparable = structuredClone(model);
  const table = comparable.cv.blocks[0];
  const original = control.model.cv.blocks[0];
  assert(table.kind === "table" && original.kind === "table");
  const main = fixture.tracks[0].cell;
  table.rows[0].cells[main] = structuredClone(original.rows[0].cells[main]);
  table.rows[0].cellDecorations![main] = structuredClone(original.rows[0].cellDecorations![main]);
  assert.deepEqual(comparable, control.model);
  assert.deepEqual(fixture.tracks, control.fixture.tracks);
  const before = structuredClone(model);
  const restored = JSON.parse(JSON.stringify(model));
  await assert.rejects(renderDossierDocx(model), /cell-ending attachment is unaccepted/);
  await assert.rejects(renderDossierDocx(restored), /cell-ending attachment is unaccepted/);
  const options = { allowUnacceptedModelIssues: true };
  const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
  const restoredBytes = new Uint8Array(
    await (await renderDossierDocx(restored, options)).arrayBuffer(),
  );
  assert.deepEqual(bytes, restoredBytes);
  assert.deepEqual(model, before);
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "lead-padding-manifest.json"),
  JSON.stringify(SIDEBAR_LEAD_PADDING_CASES, null, 2) + "\n",
);
console.log(
  "Four matched 220 mm lead representations preserve semantic ownership, all attachment flags and immutable guarded native packages.",
);
