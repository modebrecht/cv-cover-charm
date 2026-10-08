import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { control, emptyParagraphWithRuns } from "../src/lib/docx-next/native-text";
import { readZipEntries } from "../src/lib/docx-next/zip";
import {
  CONTAINER_SPAN_CASES,
  CONTAINER_DECLARED_GRID_CASES,
  CONTAINER_DECLARED_WIDTH_CASES,
  containerSpanFixture,
} from "../tests/fixtures/docx-next/sidebar-container-span";

const directory = process.argv[2];
const declaredGrid = process.argv[3] === "--declared-grid";
const declaredWidth = process.argv[3] === "--declared-width";
if (
  !directory ||
  (process.argv.length !== 3 && !(process.argv.length === 4 && (declaredGrid || declaredWidth)))
)
  throw Error(
    "Usage: bun scripts/docx-next-container-span-probe.ts QA_DIRECTORY [--declared-grid|--declared-width]",
  );
await mkdir(directory, { recursive: true });
const previous = JSON.parse(
  await readFile("docs/docx-next/sidebar-lead-window-evidence.json", "utf8"),
);
const manifest = [];
const cases = declaredGrid
  ? CONTAINER_DECLARED_GRID_CASES
  : declaredWidth
    ? CONTAINER_DECLARED_WIDTH_CASES
    : CONTAINER_SPAN_CASES;
for (const value of cases) {
  const { model, fixture } = containerSpanFixture(value);
  const original = containerSpanFixture({ ...value, carrier: "caption-only" });
  const comparable = structuredClone(model);
  const table = comparable.cv.blocks[0];
  assert(table.kind === "table");
  delete table.identityCarrier;
  assert.deepEqual(comparable, original.model);
  assert.deepEqual(fixture.tracks, original.fixture.tracks);
  if (declaredGrid || declaredWidth) {
    const unchanged = containerSpanFixture({
      ...value,
      name: `container-span-${value.orientation}-${value.leadMm}-${value.carrier}`,
      gridMode: undefined,
    });
    const widthsOnly = structuredClone(model);
    const declaredTable = widthsOnly.cv.blocks[0];
    const unchangedTable = unchanged.model.cv.blocks[0];
    assert(declaredTable.kind === "table" && unchangedTable.kind === "table");
    declaredTable.widths = unchangedTable.widths;
    delete declaredTable.widthMm;
    assert.deepEqual(widthsOnly, unchanged.model);
    assert.deepEqual(fixture.completeFields, unchanged.fixture.completeFields);
  }
  const before = structuredClone(model);
  const restored = JSON.parse(JSON.stringify(model));
  await assert.rejects(renderDossierDocx(model), /unaccepted/);
  await assert.rejects(renderDossierDocx(restored), /unaccepted/);
  const options = { allowUnacceptedModelIssues: true };
  const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
  assert.deepEqual(
    bytes,
    new Uint8Array(await (await renderDossierDocx(restored, options)).arrayBuffer()),
  );
  assert.deepEqual(model, before);
  assert.deepEqual(restored, before);
  const docxSha256 = createHash("sha256").update(bytes).digest("hex");
  const old = previous.cases.find(
    (row: { fixture: string }) => row.fixture === fixture.originalName,
  );
  assert(old, "Missing independently executed populated control");
  if (value.carrier === "caption-only") {
    if (!declaredGrid && !declaredWidth) assert.equal(docxSha256, old.docxSha256);
  } else {
    const originalBytes = new Uint8Array(
      await (await renderDossierDocx(original.model, options)).arrayBuffer(),
    );
    const originalParts = readZipEntries(originalBytes);
    const currentParts = readZipEntries(bytes);
    assert.deepEqual(
      currentParts.map((part) => part.name),
      originalParts.map((part) => part.name),
    );
    const ending = emptyParagraphWithRuns("", table.rows[0].cellEndKeepNext?.[0] ?? undefined);
    const marker = control(table.id, ending);
    for (const [index, part] of currentParts.entries()) {
      if (part.name === "word/document.xml") {
        const content = new TextDecoder().decode(part.bytes);
        assert.equal(content.split(marker).length, 2);
        assert.equal(
          content.replace(marker, ending),
          new TextDecoder().decode(originalParts[index].bytes),
        );
      } else assert.deepEqual(part.bytes, originalParts[index].bytes);
    }
  }
  manifest.push({ ...fixture, docxSha256 });
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
}
await writeFile(
  path.join(directory, "container-span-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Eight guarded populated controls; original or separately declared geometry, only-ID annotation and immutable JSON verified.",
);
