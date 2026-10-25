import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  SIDEBAR_DESCRIPTION_OWNER_CASES,
  sidebarDescriptionOwnerFixture,
} from "../tests/fixtures/docx-next/sidebar-description-owner";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-description-owner-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
for (const value of SIDEBAR_DESCRIPTION_OWNER_CASES) {
  const { model, fixture } = sidebarDescriptionOwnerFixture(value);
  const control = sidebarDescriptionOwnerFixture({ ...value, descriptionOwner: "tail-cell" });
  const comparable = structuredClone(model);
  const table = comparable.cv.blocks[0];
  assert(table.kind === "table");
  const main = fixture.tracks[0].cell;
  if (value.descriptionOwner === "opening-cell") {
    table.rows[2].cells[main] = table.rows[1].cells[main].splice(4);
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
  path.join(directory, "description-owner-manifest.json"),
  JSON.stringify(SIDEBAR_DESCRIPTION_OWNER_CASES, null, 2) + "\n",
);
console.log(
  "Four main-description ownership controls preserve semantic paragraphs, all flags, side spans and immutable guarded JSON packages.",
);
