import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { readZipEntries } from "../src/lib/docx-next/zip";
import { emptyParagraph } from "../src/lib/docx-next/native-text";
import { twips } from "../src/lib/docx-next/xml";
import { SIDEBAR_CARRIER_STORY_CASES } from "../tests/fixtures/docx-next/sidebar-carrier-story";
import { sidebarBodyCarrierFixture } from "../tests/fixtures/docx-next/sidebar-body-carrier";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-body-carrier-probe.ts DIRECTORY");
await mkdir(directory, { recursive: true });
// One long counterprobe first; no further orientation or source is prepared before its gate passes.
const value = SIDEBAR_CARRIER_STORY_CASES.find(
  (value) => value.orientation === "left" && value.kind === "both-long",
);
assert(value);
const { model, control, fixture } = sidebarBodyCarrierFixture(value);
const options = { allowUnacceptedModelIssues: true };
await assert.rejects(renderDossierDocx(model), /body boundary is unaccepted/);
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
for (let i = 0; i < original.length; i++) {
  if (!["word/document.xml", "word/settings.xml"].includes(original[i].name))
    assert.deepEqual(candidate[i].bytes, original[i].bytes);
  else {
    const old = new TextDecoder().decode(original[i].bytes);
    let expected: string;
    if (original[i].name === "word/document.xml") {
      const floating = /<w:tblpPr[^>]*\/><w:tblOverlap w:val="never"\/>/g;
      assert.equal([...old.matchAll(floating)].length, 1);
      expected = old
        .replace(floating, "")
        .replace("<w:tbl><w:tblPr>", emptyParagraph + "<w:tbl><w:tblPr>");
      const table = model.cv.blocks[0];
      assert(table.kind === "table");
      const width = `<w:tblW w:w="${twips(table.widthMm!)}" w:type="dxa"/>`;
      expected = expected.replace(
        width,
        width + `<w:tblInd w:w="${twips(table.indentMm!)}" w:type="dxa"/>`,
      );
    } else {
      expected = old
        .replace('<w:doNotBreakWrappedTables w:val="0"/>', "")
        .replace(
          '<w:compatSetting w:name="allowTextAfterFloatingTableBreak" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>',
          "",
        );
    }
    assert.equal(new TextDecoder().decode(candidate[i].bytes), expected);
  }
}
const sha256 = createHash("sha256").update(bytes).digest("hex");
await writeFile(path.join(directory, fixture.fixture + ".docx"), bytes);
await writeFile(
  path.join(directory, fixture.fixture + ".json"),
  JSON.stringify({ ...fixture, sourceSha256: sha256 }, null, 2) + "\n",
);
console.log(JSON.stringify({ fixture: fixture.fixture, sha256, prepared: 1 }));
