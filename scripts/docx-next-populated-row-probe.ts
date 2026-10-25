import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { walkBlocks } from "../src/lib/docx-next/model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  SIDEBAR_POPULATED_ROW_CASES,
  sidebarPopulatedRowFixture,
} from "../tests/fixtures/docx-next/sidebar-populated-row";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-populated-row-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const paragraphs = (blocks: Parameters<typeof walkBlocks>[0]) =>
  walkBlocks(blocks)
    .filter((block) => block.kind === "paragraph")
    .sort((a, b) => a.id.localeCompare(b.id));
for (const value of SIDEBAR_POPULATED_ROW_CASES) {
  const { model, fixture } = sidebarPopulatedRowFixture(value);
  const control = sidebarPopulatedRowFixture({ ...value, policy: "grid" });
  assert.deepEqual(paragraphs(model.cv.blocks), paragraphs(control.model.cv.blocks));
  assert.deepEqual(
    fixture.tracks.map((track) => track.lane),
    control.fixture.tracks.map((track) => track.lane),
  );
  const other = sidebarPopulatedRowFixture({
    ...value,
    orientation: value.orientation === "left" ? "right" : "left",
  });
  assert.deepEqual(paragraphs(model.cv.blocks), paragraphs(other.model.cv.blocks));
  const before = structuredClone(model);
  if (value.policy !== "grid") {
    await assert.rejects(renderDossierDocx(model), /cell-ending attachment is unaccepted/);
    await assert.rejects(
      renderDossierDocx(JSON.parse(JSON.stringify(model))),
      /cell-ending attachment is unaccepted/,
    );
  }
  const options = { allowUnacceptedModelIssues: value.policy !== "grid" };
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
  path.join(directory, "populated-row-manifest.json"),
  JSON.stringify(SIDEBAR_POPULATED_ROW_CASES, null, 2) + "\n",
);
console.log(
  "Four populated controls preserve every paragraph across ownership/orientation and immutable JSON packages; selective export remains guarded.",
);
