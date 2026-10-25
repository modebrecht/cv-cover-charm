import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { walkBlocks } from "../src/lib/docx-next/model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  SIDEBAR_CONTINUOUS_CELL_CASES,
  sidebarContinuousCellFixture,
} from "../tests/fixtures/docx-next/sidebar-continuous-cell";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-continuous-cell-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const previous = JSON.parse(
  await readFile("docs/docx-next/sidebar-lead-main-ending-evidence.json", "utf8"),
);
for (const value of SIDEBAR_CONTINUOUS_CELL_CASES) {
  const { model, fixture } = sidebarContinuousCellFixture(value);
  const original = sidebarContinuousCellFixture({ ...value, composition: "three-row" });
  const normalized = structuredClone(model);
  normalized.cv.blocks = original.model.cv.blocks;
  assert.deepEqual(normalized, original.model);
  const table = model.cv.blocks[0];
  const oldTable = original.model.cv.blocks[0];
  assert(table.kind === "table" && oldTable.kind === "table");
  assert.deepEqual(table.widths, oldTable.widths);
  assert.equal(table.id, oldTable.id);
  assert.deepEqual(fixture.tracks, original.fixture.tracks);
  assert.deepEqual(fixture.completeFields, original.fixture.completeFields);
  for (const track of fixture.tracks)
    assert.deepEqual(
      table.rows.flatMap((row) => walkBlocks(row.cells[track.cell])),
      oldTable.rows.flatMap((row) => walkBlocks(row.cells[track.cell])),
    );
  const before = structuredClone(model),
    restored = JSON.parse(JSON.stringify(model));
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
  const docxSha256 = createHash("sha256").update(bytes).digest("hex");
  if (value.composition === "three-row") {
    const old = previous.cases.find(
      (row: { fixture: string }) => row.fixture === fixture.originalName,
    );
    assert(old, "Missing independently executed original control");
    assert.equal(docxSha256, old.docxSha256);
  }
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "continuous-cell-manifest.json"),
  JSON.stringify(SIDEBAR_CONTINUOUS_CELL_CASES, null, 2) + "\n",
);
console.log(
  "Four guarded sources; original control hashes, whole paragraphs, lane geometry and immutable JSON verified.",
);
