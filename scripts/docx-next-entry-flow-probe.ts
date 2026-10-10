import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { readZipEntries } from "../src/lib/docx-next/zip";
import { SIDEBAR_CARRIER_STORY_CASES } from "../tests/fixtures/docx-next/sidebar-carrier-story";
import { sidebarEntryFlowFixture } from "../tests/fixtures/docx-next/sidebar-entry-flow";

const directory = process.argv[2];
const keepBodyBoundaryWithTable = process.argv[3] === "--keep-boundary";
if (
  !directory ||
  (process.argv.length !== 3 && !(process.argv.length === 4 && keepBodyBoundaryWithTable))
)
  throw Error("Usage: bun scripts/docx-next-entry-flow-probe.ts DIRECTORY [--keep-boundary]");
await mkdir(directory, { recursive: true });
const ordered = [...SIDEBAR_CARRIER_STORY_CASES].sort(
  (a, b) => Number(b.kind === "both-long") - Number(a.kind === "both-long"),
);
for (const value of ordered) {
  const { model, control, fixture } = sidebarEntryFlowFixture(value, { keepBodyBoundaryWithTable });
  await assert.rejects(renderDossierDocx(model), /body boundary is unaccepted/);
  const options = { allowUnacceptedModelIssues: true };
  const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
  assert.deepEqual(
    bytes,
    new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
    ),
  );
  const original = readZipEntries(
    new Uint8Array(await (await renderDossierDocx(control, options)).arrayBuffer()),
  );
  const candidate = readZipEntries(bytes);
  assert.deepEqual(
    candidate.map((part) => part.name),
    original.map((part) => part.name),
  );
  for (let i = 0; i < original.length; i++)
    if (original[i].name !== "word/document.xml")
      assert.deepEqual(candidate[i].bytes, original[i].bytes);
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  await writeFile(path.join(directory, fixture.fixture + ".docx"), bytes);
  await writeFile(
    path.join(directory, fixture.fixture + ".json"),
    JSON.stringify({ ...fixture, sourceSha256 }, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "manifest.json"),
  JSON.stringify(
    ordered.map((value) => value.name.replace("carrier-story", "entry-flow")),
    null,
    2,
  ) + "\n",
);
