import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { readZipEntries } from "../src/lib/docx-next/zip";
import { emptyParagraph } from "../src/lib/docx-next/native-text";
import {
  SIDEBAR_FLOATING_ANCHOR_CASES,
  sidebarFloatingAnchorFixture,
} from "../tests/fixtures/docx-next/sidebar-floating-anchor";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-floating-anchor-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const option = { allowUnacceptedModelIssues: true };
const previous = JSON.parse(
  await readFile("docs/docx-next/sidebar-floating-continuation-evidence.json", "utf8"),
);
const manifest = [];
for (const value of SIDEBAR_FLOATING_ANCHOR_CASES) {
  const { model, fixture } = sidebarFloatingAnchorFixture(value);
  const control = sidebarFloatingAnchorFixture({ ...value, anchor: "empty-separator" }).model;
  const before = structuredClone(model),
    restored = JSON.parse(JSON.stringify(model));
  const normalized = structuredClone(model),
    table = normalized.cv.blocks[0];
  assert(table.kind === "table" && table.position);
  delete table.position.anchorParagraphId;
  assert.deepEqual(normalized, control);
  await assert.rejects(renderDossierDocx(model), /floating table .*unaccepted/);
  await assert.rejects(renderDossierDocx(restored), /floating table .*unaccepted/);
  const bytes = new Uint8Array(await (await renderDossierDocx(model, option)).arrayBuffer());
  assert.deepEqual(
    bytes,
    new Uint8Array(await (await renderDossierDocx(restored, option)).arrayBuffer()),
  );
  assert.deepEqual(model, before);
  const controls = readZipEntries(
      new Uint8Array(await (await renderDossierDocx(control, option)).arrayBuffer()),
    ),
    entries = readZipEntries(bytes);
  assert.deepEqual(
    entries.map((row) => row.name),
    controls.map((row) => row.name),
  );
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].name === "word/document.xml" && value.anchor === "following-paragraph") {
      const original = new TextDecoder().decode(controls[i].bytes),
        current = new TextDecoder().decode(entries[i].bytes);
      const following = `</w:tbl>${emptyParagraph}<w:sdt><w:sdtPr><w:alias w:val="${fixture.anchorParagraphId}"/>`;
      assert.equal(original.split(following).length, 2);
      assert.equal(original.replace(following, following.replace(emptyParagraph, "")), current);
    } else assert.deepEqual(entries[i].bytes, controls[i].bytes);
  }
  const docxSha256 = createHash("sha256").update(bytes).digest("hex");
  if (value.anchor === "empty-separator") {
    const old = previous.devCli.preparedSources.find(
      (row: { name: string }) =>
        row.name === `floating-continuation-${value.orientation}-${value.kind}-all-pages`,
    );
    assert(old);
    assert.equal(docxSha256, old.docxSha256);
  }
  manifest.push({ ...value, docxSha256 });
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "floating-anchor-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Twelve guarded anchor sources; original hashes, whole stories and removal of only the unowned separator verified.",
);
