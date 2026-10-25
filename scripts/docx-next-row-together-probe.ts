import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  SIDEBAR_ROW_TOGETHER_CASES,
  sidebarRowTogetherFixture,
} from "../tests/fixtures/docx-next/sidebar-row-together";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-row-together-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
for (const value of SIDEBAR_ROW_TOGETHER_CASES) {
  const { model, fixture } = sidebarRowTogetherFixture(value);
  const control = sidebarRowTogetherFixture({ ...value, keepTogether: true });
  const comparable = structuredClone(model);
  const table = comparable.cv.blocks[0];
  assert(table.kind === "table");
  table.rows[1].keepTogether = true;
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
  path.join(directory, "row-together-manifest.json"),
  JSON.stringify(SIDEBAR_ROW_TOGETHER_CASES, null, 2) + "\n",
);
console.log(
  "Four matched short-row cantSplit controls preserve native ownership, complete text, lanes and immutable JSON packages; normal export stays guarded.",
);
