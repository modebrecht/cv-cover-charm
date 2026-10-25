import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  SIDEBAR_FRAME_CASES,
  sidebarFrameFixture,
} from "../tests/fixtures/docx-next/sidebar-frame";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw new Error("Usage: bun scripts/docx-next-frame-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
for (const value of SIDEBAR_FRAME_CASES) {
  const { model, fixture } = sidebarFrameFixture(value);
  const before = structuredClone(model);
  await assert.rejects(renderDossierDocx(model), /paragraph frame pagination is unaccepted/);
  await assert.rejects(
    renderDossierDocx(JSON.parse(JSON.stringify(model))),
    /paragraph frame pagination is unaccepted/,
  );
  const options = { allowUnacceptedModelIssues: true };
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
  path.join(directory, "frame-manifest.json"),
  JSON.stringify(SIDEBAR_FRAME_CASES, null, 2) + "\n",
);
console.log(
  "Created four bounded frame diagnostics; default rejection and immutable JSON packages pass.",
);
