import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { validateDecoration } from "../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { paintPng } from "../src/lib/docx-next/artwork";
import { readZipEntries } from "../src/lib/docx-next/zip";
import { briefFixture } from "../tests/fixtures/docx-next/brief";
import { graphicCandidateFixture } from "../tests/fixtures/docx-next/graphic-candidate";

const strict = process.argv[2] === "--validate-paint";
assert(process.argv.length === (strict ? 3 : 2), "Only --validate-paint is supported.");
const asset = {
  bytes: paintPng({ color: "123456" }),
  widthPx: 1,
  heightPx: 1,
  extension: "png" as const,
  contentType: "image/png" as const,
};
const rows = [];
for (const template of ["brief", "neon", "verlauf"]) {
  const model = buildDossierDocModel(
    template === "brief" ? briefFixture() : graphicCandidateFixture(template),
  );
  const original = structuredClone(model);
  const paints: Array<{ id: string; layer?: number }> = [];
  const bytes = new Uint8Array(
    await (
      await renderDossierDocx(model, {
        rasterizeDecoration: async (paint) => {
          if (strict) validateDecoration(paint);
          paints.push({ id: paint.id, layer: paint.paintLayer });
          return asset;
        },
      })
    ).arrayBuffer(),
  );
  assert.deepEqual(model, original);
  const fields = readZipEntries(bytes)
    .filter((part) => part.name.endsWith(".xml"))
    .reduce(
      (count, part) =>
        count + (new TextDecoder().decode(part.bytes).match(/<w:tag /g)?.length ?? 0),
      0,
    );
  rows.push({
    template,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    fields,
    paints,
    sourceModelUnchanged: true,
    paintValidated: strict,
  });
}
console.log(JSON.stringify(rows));
