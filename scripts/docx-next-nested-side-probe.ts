import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  SIDEBAR_NESTED_SIDE_CASES,
  sidebarNestedSideFixture,
} from "../tests/fixtures/docx-next/sidebar-nested-side";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-nested-side-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
for (const value of SIDEBAR_NESTED_SIDE_CASES) {
  const { model, fixture } = sidebarNestedSideFixture(value);
  const control = sidebarNestedSideFixture({ ...value, sideComposition: "direct" });
  const comparable = structuredClone(model);
  const table = comparable.cv.blocks[0];
  assert(table.kind === "table");
  if (value.sideComposition === "nested") {
    const inner = table.rows[0].cells[fixture.tracks[1].cell][0];
    assert(inner.kind === "table" && inner.rows.length === 1);
    table.rows[0].cells[fixture.tracks[1].cell] = inner.rows[0].cells[0];
  }
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
  path.join(directory, "nested-side-manifest.json"),
  JSON.stringify(SIDEBAR_NESTED_SIDE_CASES, null, 2) + "\n",
);
console.log(
  "Four guarded side compositions preserve outer owners/spans, complete paragraph fields, all existing flags and immutable JSON packages.",
);
