import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { walkBlocks } from "../src/lib/docx-next/model";
import {
  SIDEBAR_BODY_CASES,
  sidebarBodyAttachmentFixture,
} from "../tests/fixtures/docx-next/sidebar-body-attachment";
const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw new Error("Usage: bun scripts/docx-next-body-attachment-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const signature = (blocks: Parameters<typeof walkBlocks>[0]) =>
  walkBlocks(blocks).filter((block) => block.kind === "paragraph");
for (const value of SIDEBAR_BODY_CASES) {
  const { model, fixture } = sidebarBodyAttachmentFixture(value);
  const control = sidebarBodyAttachmentFixture({ ...value, mode: "grid" });
  assert.deepEqual(signature(model.cv.blocks), signature(control.model.cv.blocks));
  assert.deepEqual(fixture.lane, control.fixture.lane);
  const before = structuredClone(model);
  const docx = new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer());
  const restored = new Uint8Array(
    await (await renderDossierDocx(JSON.parse(JSON.stringify(model)))).arrayBuffer(),
  );
  assert.deepEqual(docx, restored);
  assert.deepEqual(model, before);
  await writeFile(path.join(directory, value.name + ".docx"), docx);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "body-attachment-manifest.json"),
  JSON.stringify(SIDEBAR_BODY_CASES, null, 2) + "\n",
);
console.log(
  `Created ${SIDEBAR_BODY_CASES.length} native ownership controls; paragraphs, lane geometry and model JSON packages preserved.`,
);
