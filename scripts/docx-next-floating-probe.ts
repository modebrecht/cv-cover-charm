import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  SIDEBAR_FLOATING_CASES,
  sidebarFloatingFixture,
  paragraphSignature,
} from "../tests/fixtures/docx-next/sidebar-floating";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw new Error("Usage: bun scripts/docx-next-floating-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
for (const value of SIDEBAR_FLOATING_CASES) {
  const { model, main, fixture } = sidebarFloatingFixture(value);
  const before = structuredClone(model);
  const options = { allowUnacceptedModelIssues: value.floating };
  if (value.floating)
    await assert.rejects(renderDossierDocx(model), /floating table pagination is unaccepted/);
  const source = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
  const restored = new Uint8Array(
    await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
  );
  assert.deepEqual(source, restored);
  assert.deepEqual(model, before);
  const mainIds = new Set(paragraphSignature(main).map((paragraph) => paragraph.id));
  assert.deepEqual(
    paragraphSignature(model.cv.blocks).filter((paragraph) => mainIds.has(paragraph.id)),
    paragraphSignature(main),
  );
  await writeFile(path.join(directory, value.name + ".docx"), source);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "floating-manifest.json"),
  JSON.stringify(SIDEBAR_FLOATING_CASES, null, 2) + "\n",
);
console.log(
  `Created ${SIDEBAR_FLOATING_CASES.length} native placement diagnostics; default export guard and immutable JSON packages verified.`,
);
