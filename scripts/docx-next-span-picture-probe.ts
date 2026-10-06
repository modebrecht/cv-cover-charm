/** Deliberately failing native table specimen, never an app export path. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { parallelFlowTable } from "../src/lib/docx-next/parallel-flow";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { walkBlocks } from "../src/lib/docx-next/model";
import { paintPng } from "../src/lib/docx-next/artwork";
import { sidebarFixture, sidebarOpeningFieldIds } from "../tests/fixtures/docx-next/sidebar";
import { briefFixture } from "../tests/fixtures/docx-next/brief";

const directory = process.argv[2];
if (!directory) throw new Error("Usage: bun scripts/docx-next-span-picture-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const source = buildDossierDocModel(sidebarFixture("photo-free-main"));
// Neutral table-test host: this is not a Sidebar candidate or app export.
const model = buildDossierDocModel(briefFixture("normal"));
const flow = source.cv.blocks.find((block) => block.kind === "parallel-flow")!;
if (flow.kind !== "parallel-flow") throw new Error("Missing probe flow");
const zone = flow.tracks[1].blocks[0];
if (zone.kind !== "image-zone") throw new Error("Missing probe picture zone");
zone.leftInsetMm = 6;
const width = model.cv.page.widthMm - model.cv.page.margins.left - model.cv.page.margins.right;
const table = parallelFlowTable(flow, width);
// Mirror an already lowered native table to construct the vMerge counterexample.
// The app's parallel-flow guard stays active; production code is never modified.
table.widths.reverse();
for (const row of table.rows) {
  row.cells.reverse();
  row.cellRowSpans?.reverse();
  row.cellDecorations?.reverse();
}
model.cv.blocks = [table];
const png = paintPng({ color: "E61414", endColor: "1432D2" });
const docx = await renderDossierDocx(model, {
  normalizeImage: async () => ({
    bytes: png,
    widthPx: 1,
    heightPx: 256,
    extension: "png",
    contentType: "image/png",
  }),
});
await writeFile(
  path.join(directory, "native-picture-before-span.docx"),
  new Uint8Array(await docx.arrayBuffer()),
);
const paragraphs = walkBlocks(model.cv.blocks);
const leftMm = model.cv.page.margins.left;
await writeFile(
  path.join(directory, "flow-probe.json"),
  JSON.stringify(
    {
      fixture: "native-picture-before-span",
      expectedFailure: "first-page flow detached",
      parts: [
        { expectedPages: 1, contentBoxMm: model.cover.page.margins },
        { expectedPages: 1, contentBoxMm: model.letter.page.margins },
        {
          expectedPages: 2,
          contentBoxMm: model.cv.page.margins,
          firstPageFlowProbes: sidebarOpeningFieldIds("photo-free-mirrored-main").map((fieldId) => {
            const field = paragraphs.find(
              (block) => block.kind === "paragraph" && block.id === fieldId,
            );
            if (!field || field.kind !== "paragraph") throw new Error(`Missing probe ${fieldId}`);
            return {
              fieldId,
              text: field.runs.map((run) => run.text).join(""),
              leftMm,
              rightMm: leftMm + table.widths[0],
            };
          }),
        },
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log("Created unsupported native table specimen; render QA must reject its opening flow.");
