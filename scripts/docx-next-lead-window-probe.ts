import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  SIDEBAR_LEAD_WINDOW_CASES,
  sidebarLeadWindowFixture,
} from "../tests/fixtures/docx-next/sidebar-lead-window";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-lead-window-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
for (const value of SIDEBAR_LEAD_WINDOW_CASES) {
  const { model, fixture } = sidebarLeadWindowFixture(value);
  const control = sidebarLeadWindowFixture({ ...value, leadMm: 220 });
  const comparable = structuredClone(model);
  const table = comparable.cv.blocks[0];
  assert(table.kind === "table");
  const lead = table.rows[0].cells[fixture.tracks[0].cell][0];
  assert(lead.kind === "spacer");
  lead.heightMm = 220;
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
  path.join(directory, "lead-window-manifest.json"),
  JSON.stringify(SIDEBAR_LEAD_WINDOW_CASES, null, 2) + "\n",
);
console.log(
  "Eight bounded lead-height controls retain the original owning paragraphs, all attachment flags and immutable guarded JSON packages.",
);
