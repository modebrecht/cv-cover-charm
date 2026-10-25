import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  SIDEBAR_MAIN_ENDING_CASES,
  sidebarMainEndingFixture,
} from "../tests/fixtures/docx-next/sidebar-main-ending";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-main-ending-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
for (const value of SIDEBAR_MAIN_ENDING_CASES) {
  const { model, fixture } = sidebarMainEndingFixture(value);
  const control = sidebarMainEndingFixture({ ...value, scope: "all-cells" });
  const comparable = structuredClone(model);
  const table = comparable.cv.blocks[0];
  assert(table.kind === "table");
  table.rows[1].cellEndKeepNext = [true, true, true];
  assert.deepEqual(comparable, control.model);
  assert.deepEqual(fixture.tracks, control.fixture.tracks);
  const restored = JSON.parse(JSON.stringify(model));
  await assert.rejects(renderDossierDocx(model), /cell-ending attachment is unaccepted/);
  await assert.rejects(renderDossierDocx(restored), /cell-ending attachment is unaccepted/);
  const before = structuredClone(model);
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
  path.join(directory, "main-ending-manifest.json"),
  JSON.stringify(SIDEBAR_MAIN_ENDING_CASES, null, 2) + "\n",
);
console.log(
  "Four matched attachment-scope controls preserve native ownership, complete text, lanes and immutable JSON packages; normal export stays guarded.",
);
