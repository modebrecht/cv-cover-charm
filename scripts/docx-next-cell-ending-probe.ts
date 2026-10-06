import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { walkBlocks } from "../src/lib/docx-next/model";
import {
  SIDEBAR_CELL_END_CASES,
  sidebarCellEndingFixture,
} from "../tests/fixtures/docx-next/sidebar-cell-ending";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw new Error("Usage: bun scripts/docx-next-cell-ending-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const paragraphs = (blocks: Parameters<typeof walkBlocks>[0]) =>
  walkBlocks(blocks).filter((block) => block.kind === "paragraph");
for (const value of SIDEBAR_CELL_END_CASES) {
  const { model, fixture } = sidebarCellEndingFixture(value);
  const control = sidebarCellEndingFixture({ ...value, policy: "default" });
  assert.deepEqual(paragraphs(model.cv.blocks), paragraphs(control.model.cv.blocks));
  assert.deepEqual(fixture.lane, control.fixture.lane);
  const before = structuredClone(model);
  if (value.policy !== "default") {
    await assert.rejects(renderDossierDocx(model), /cell-ending attachment is unaccepted/);
    await assert.rejects(
      renderDossierDocx(JSON.parse(JSON.stringify(model))),
      /cell-ending attachment is unaccepted/,
    );
  }
  const options = { allowUnacceptedModelIssues: value.policy !== "default" };
  const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
  const restored = new Uint8Array(
    await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
  );
  assert.deepEqual(bytes, restored);
  assert.deepEqual(model, before);
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "cell-ending-manifest.json"),
  JSON.stringify(SIDEBAR_CELL_END_CASES, null, 2) + "\n",
);
console.log(
  "Created 12 cell-ending controls; paragraph/lane equality, export guards and immutable JSON packages pass.",
);
