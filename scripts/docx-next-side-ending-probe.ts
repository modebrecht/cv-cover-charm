import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { sidebarMainEndingFixture } from "../tests/fixtures/docx-next/sidebar-main-ending";
import {
  SIDEBAR_SIDE_ENDING_CASES,
  sidebarSideEndingFixture,
} from "../tests/fixtures/docx-next/sidebar-side-ending";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-side-ending-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
for (const value of SIDEBAR_SIDE_ENDING_CASES) {
  const { model, fixture } = sidebarSideEndingFixture(value);
  const original = sidebarMainEndingFixture(value);
  const comparable = structuredClone(model);
  const table = comparable.cv.blocks[0];
  assert(table.kind === "table");
  table.rows[0].cellEndKeepNext![fixture.tracks[1].cell] = false;
  assert.deepEqual(comparable, original.model);
  assert.deepEqual(fixture.tracks, original.fixture.tracks);
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
  if (!value.sideEndingKeepNext) {
    const originalBytes = new Uint8Array(
      await (await renderDossierDocx(original.model, options)).arrayBuffer(),
    );
    assert.deepEqual(bytes, originalBytes);
  }
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "side-ending-manifest.json"),
  JSON.stringify(SIDEBAR_SIDE_ENDING_CASES, null, 2) + "\n",
);
console.log(
  "Four isolated side-cell endings: semantic tail false, original packages, immutable JSON and closed normal exports verified.",
);
