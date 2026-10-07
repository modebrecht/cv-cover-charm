import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { walkBlocks } from "../src/lib/docx-next/model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { sidebarMainEndingFixture } from "../tests/fixtures/docx-next/sidebar-main-ending";
import {
  SIDEBAR_SIDE_TERMINAL_CASES,
  sidebarSideTerminalFixture,
} from "../tests/fixtures/docx-next/sidebar-side-terminal";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-side-terminal-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
for (const value of SIDEBAR_SIDE_TERMINAL_CASES) {
  const { model, fixture } = sidebarSideTerminalFixture(value);
  const control = sidebarMainEndingFixture(value);
  const comparable = structuredClone(model);
  const table = comparable.cv.blocks[0];
  assert(table.kind === "table");
  const side = fixture.tracks[1].cell;
  const last = walkBlocks(table.rows[0].cells[side]).find(
    (block) => block.id === fixture.sideTerminalFieldId,
  );
  assert(last?.kind === "paragraph");
  last.keepNext = false;
  table.rows[0].cellEndKeepNext![side] = false;
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
  if (value.variant === "detached") {
    const controlBytes = new Uint8Array(
      await (await renderDossierDocx(control.model, options)).arrayBuffer(),
    );
    assert.deepEqual(bytes, controlBytes);
  }
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "side-terminal-manifest.json"),
  JSON.stringify(SIDEBAR_SIDE_TERMINAL_CASES, null, 2) + "\n",
);
console.log(
  "Six isolated side-terminal controls; immutable JSON, complete fields, original baseline packages and closed export gates verified.",
);
