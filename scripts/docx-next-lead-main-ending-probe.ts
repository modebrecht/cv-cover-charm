import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  SIDEBAR_LEAD_MAIN_ENDING_CASES,
  sidebarLeadMainEndingFixture,
} from "../tests/fixtures/docx-next/sidebar-lead-main-ending";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-lead-main-ending-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const previous = JSON.parse(
  await readFile("docs/docx-next/sidebar-side-ending-evidence.json", "utf8"),
);
for (const value of SIDEBAR_LEAD_MAIN_ENDING_CASES) {
  const { model, fixture } = sidebarLeadMainEndingFixture(value);
  const control = sidebarLeadMainEndingFixture({ ...value, mainLeadEndingKeepNext: false });
  const comparable = structuredClone(model);
  const table = comparable.cv.blocks[0];
  assert(table.kind === "table" && table.rows[0].cellEndKeepNext);
  table.rows[0].cellEndKeepNext[fixture.tracks[0].cell] = false;
  assert.deepEqual(comparable, control.model);
  assert.deepEqual(fixture.tracks, control.fixture.tracks);
  assert.deepEqual(fixture.completeFields, control.fixture.completeFields);
  const before = structuredClone(model);
  const restored = JSON.parse(JSON.stringify(model));
  await assert.rejects(renderDossierDocx(model), /cell-ending attachment is unaccepted/);
  await assert.rejects(renderDossierDocx(restored), /cell-ending attachment is unaccepted/);
  const options = { allowUnacceptedModelIssues: true };
  const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
  assert.deepEqual(
    bytes,
    new Uint8Array(await (await renderDossierDocx(restored, options)).arrayBuffer()),
  );
  assert.deepEqual(model, before);
  assert.deepEqual(restored, before);
  if (!value.mainLeadEndingKeepNext) {
    const old = previous.cases.find(
      (row: { fixture: string }) => row.fixture === `${value.orientation}-detached-220`,
    );
    assert(old, "Missing original detached main-lead control");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), old.docxSha256);
  }
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "lead-main-ending-manifest.json"),
  JSON.stringify(SIDEBAR_LEAD_MAIN_ENDING_CASES, null, 2) + "\n",
);
console.log(
  "Four guarded main-lead ending controls; one flag, original controls, whole paragraphs and immutable JSON verified.",
);
