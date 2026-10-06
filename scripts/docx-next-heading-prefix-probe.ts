/** Compare the unchanged controls with opt-in generic native prefix composition. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { paintPng } from "../src/lib/docx-next/artwork";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { sectionHeadingPrefix } from "../src/lib/docx-next/heading-prefix";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { briefFixture } from "../tests/fixtures/docx-next/brief";
import { walkBlocks } from "../src/lib/docx-next/model";
import {
  SIDEBAR_HEADING_CASES,
  SIDEBAR_PREFIX_BOUNDARY_CASES,
  sidebarHeadingAttachmentFixture,
} from "../tests/fixtures/docx-next/sidebar-heading-attachment";
const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw new Error("Usage: bun scripts/docx-next-heading-prefix-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const png = paintPng({ color: "E61414", endColor: "1432D2" });
const imageOptions = {
  normalizeImage: async () => ({
    bytes: png,
    widthPx: 1,
    heightPx: 256,
    extension: "png" as const,
    contentType: "image/png" as const,
  }),
};
const cases = [...SIDEBAR_HEADING_CASES, ...SIDEBAR_PREFIX_BOUNDARY_CASES];
for (const value of cases) {
  const original = sidebarHeadingAttachmentFixture(value);
  const { model, fixture } = sidebarHeadingAttachmentFixture(value, true);
  const paragraphs = (blocks: typeof model.cv.blocks) =>
    walkBlocks(blocks)
      .filter((b) => b.kind === "paragraph")
      .map((b) => ({ id: b.id, runs: b.runs }))
      .sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(paragraphs(model.cv.blocks), paragraphs(original.model.cv.blocks));
  const table = model.cv.blocks[0];
  assert(table.kind === "table");
  const paint = table.rows[0].cellDecorations?.[2];
  const railPaintProbe =
    value.kind !== "oversized" && value.rail && paint?.fillColor
      ? {
          leftMm: model.cv.page.margins.left + table.widths[0] + table.widths[1],
          rightMm: model.cv.page.widthMm - model.cv.page.margins.right,
          color: paint.fillColor,
        }
      : undefined;
  const docx = new Uint8Array(await (await renderDossierDocx(model, imageOptions)).arrayBuffer());
  const restored = new Uint8Array(
    await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), imageOptions)).arrayBuffer(),
  );
  assert.deepEqual(docx, restored, "Native prefix model JSON roundtrip changed its package");
  await writeFile(path.join(directory, fixture.fixture + ".docx"), docx);
  await writeFile(
    path.join(directory, fixture.fixture + ".json"),
    JSON.stringify({ ...fixture, railPaintProbe }, null, 2) + "\n",
  );
}
const insetModel = buildDossierDocModel(briefFixture("normal"));
const school = walkBlocks(insetModel.cv.blocks).find(
  (b) => b.kind === "section" && b.id === "cv.section.schule",
);
assert(school?.kind === "section");
const insetSource = { ...school, contentIndentMm: 7 };
insetModel.cv.blocks = [sectionHeadingPrefix(insetSource, 3)];
const insetParagraphs = walkBlocks(insetModel.cv.blocks).filter((b) => b.kind === "paragraph");
const insetField = (fieldId: string) => {
  const p = insetParagraphs.find((b) => b.id === fieldId);
  assert(p);
  return { fieldId, text: p.runs.map((r) => r.text).join(""), leftMm: 20, rightMm: 190 };
};
const insetCase = { name: "inset", kind: "inset", photo: false, rail: false };
const insetFixture = {
  fixture: "prefix-inset",
  diagnostic: insetCase,
  nativePrefix: true,
  cvSemanticText: insetParagraphs.map((p) => p.runs.map((r) => r.text).join("")),
  parts: [
    { expectedPages: 1, contentBoxMm: insetModel.cover.page.margins },
    { expectedPages: 1, contentBoxMm: insetModel.letter.page.margins },
    {
      contentBoxMm: insetModel.cv.page.margins,
      firstPageFlowProbes: [
        insetField("cv.entry.schule:demo-s1.title"),
        insetField("cv.entry.schule:demo-s1.description"),
      ],
    },
  ],
  insetProbe: {
    heading: insetField("cv.section.schule.heading"),
    body: [
      "cv.entry.schule:demo-s1.date",
      "cv.entry.schule:demo-s1.description",
      "cv.entry.schule:demo-s2.date",
    ].map(insetField),
    mm: 7,
  },
};
const insetDocx = new Uint8Array(await (await renderDossierDocx(insetModel)).arrayBuffer());
assert.deepEqual(
  insetDocx,
  new Uint8Array(
    await (await renderDossierDocx(JSON.parse(JSON.stringify(insetModel)))).arrayBuffer(),
  ),
);
await writeFile(path.join(directory, "prefix-inset.docx"), insetDocx);
await writeFile(
  path.join(directory, "prefix-inset.json"),
  JSON.stringify(insetFixture, null, 2) + "\n",
);
await writeFile(
  path.join(directory, "heading-prefix-manifest.json"),
  JSON.stringify([...cases, insetCase], null, 2) + "\n",
);
console.log(
  `Created ${cases.length + 1} opt-in native prefix specimens; all semantic fields/runs and JSON packages preserved.`,
);
