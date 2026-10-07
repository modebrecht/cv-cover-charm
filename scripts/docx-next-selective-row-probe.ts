import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { walkBlocks } from "../src/lib/docx-next/model";
import {
  SIDEBAR_SELECTIVE_ROW_CASES,
  sidebarSelectiveRowFixture,
} from "../tests/fixtures/docx-next/sidebar-selective-row";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw new Error("Usage: bun scripts/docx-next-selective-row-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const paragraphs = (blocks: Parameters<typeof walkBlocks>[0]) =>
  walkBlocks(blocks).filter((block) => block.kind === "paragraph");
for (const value of SIDEBAR_SELECTIVE_ROW_CASES) {
  const { model, fixture } = sidebarSelectiveRowFixture(value);
  const control = sidebarSelectiveRowFixture({ ...value, policy: "grid" });
  assert.deepEqual(paragraphs(model.cv.blocks), paragraphs(control.model.cv.blocks));
  assert.deepEqual(fixture.lane, control.fixture.lane);
  const before = structuredClone(model);
  const options = { allowUnacceptedModelIssues: value.policy !== "grid" };
  if (options.allowUnacceptedModelIssues) {
    await assert.rejects(renderDossierDocx(model), /cell-ending attachment is unaccepted/);
    await assert.rejects(
      renderDossierDocx(JSON.parse(JSON.stringify(model))),
      /cell-ending attachment is unaccepted/,
    );
  }
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
  path.join(directory, "selective-row-manifest.json"),
  JSON.stringify(SIDEBAR_SELECTIVE_ROW_CASES, null, 2) + "\n",
);
console.log(
  "Created 18 outer-row controls; semantic paragraphs/lanes, guards and immutable model JSON packages pass.",
);
