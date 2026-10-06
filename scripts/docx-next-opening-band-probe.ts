/** Native opening-band feasibility specimen; never an application export path. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { parallelFlowTable } from "../src/lib/docx-next/parallel-flow";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { walkBlocks, type ParallelFlowBlock } from "../src/lib/docx-next/model";
import { paintPng } from "../src/lib/docx-next/artwork";
import { sidebarFixture, sidebarOpeningFieldIds } from "../tests/fixtures/docx-next/sidebar";
import { briefFixture } from "../tests/fixtures/docx-next/brief";

const directory = process.argv[2];
if (!directory)
  throw new Error(
    "Usage: bun scripts/docx-next-opening-band-probe.ts QA_DIRECTORY [--row-continuation] [--separate-tables]",
  );
await mkdir(directory, { recursive: true });
const rowContinuation = process.argv.includes("--row-continuation");
const separateTables = process.argv.includes("--separate-tables");
if (
  process.argv.slice(3).some((flag) => !["--row-continuation", "--separate-tables"].includes(flag))
)
  throw new Error(
    "Unknown opening-band option; only the bounded short counterexample is supported",
  );
const input = sidebarFixture("photo-free-main");
const source = buildDossierDocModel(input);
const flow = source.cv.blocks.find(
  (block): block is ParallelFlowBlock => block.kind === "parallel-flow",
)!;
// The source is supported. Mirror its semantic tracks only in this neutral native-table specimen.
const mirrored: ParallelFlowBlock = {
  ...flow,
  tracks: structuredClone(flow.tracks).reverse(),
  spanningTracks: [1],
};
const side = mirrored.tracks[1];
side.decoration!.border!.side = "left";
const zone = mirrored.tracks[0].blocks[0];
assert.equal(zone.kind, "image-zone");
if (zone.kind === "image-zone") zone.leftInsetMm = 6;
// Counts declare semantic block boundaries, never visible strings, sizes or page predictions.
const openingBlockCounts = [4, 1]; // picture/title/name/initial section; contact section
const opening: ParallelFlowBlock = {
  ...mirrored,
  id: "probe.opening-band",
  rowAlignment: undefined,
  spanningTracks: undefined,
  leadingInsetMm: undefined,
  tracks: mirrored.tracks.map((track, index) => ({
    ...track,
    blocks: track.blocks.slice(0, openingBlockCounts[index]),
    decoration: {
      ...(track.decoration ?? { paddingXMm: 0, paddingYMm: 0 }),
      paddingTopMm: (track.decoration?.paddingYMm ?? 0) + (mirrored.leadingInsetMm ?? 0),
      paddingBottomMm: 0,
    },
  })),
};
const continuation: ParallelFlowBlock = {
  ...mirrored,
  id: "probe.track-continuation",
  spanningTracks: rowContinuation ? [] : mirrored.spanningTracks,
  leadingInsetMm: 0,
  tracks: mirrored.tracks.map((track, index) => ({
    ...track,
    blocks: track.blocks.slice(openingBlockCounts[index]),
    decoration: {
      ...(track.decoration ?? { paddingXMm: 0, paddingYMm: 0 }),
      paddingTopMm: 0,
    },
  })),
};
const model = buildDossierDocModel(briefFixture("normal"));
const width = model.cv.page.widthMm - model.cv.page.margins.left - model.cv.page.margins.right;
const table = parallelFlowTable(opening, width);
const tail = parallelFlowTable(continuation, width);
assert.deepEqual(table.widths, tail.widths);
table.id = "probe.opening-band-and-continuation";
// One native table preserves the rail without an inter-table separator paragraph.
if (!separateTables) table.rows.push(...tail.rows);
model.cv.blocks = separateTables ? [table, tail] : [table];
const semanticIds = (blocks: Parameters<typeof walkBlocks>[0]) =>
  walkBlocks(blocks)
    .filter((block) => ["paragraph", "image", "entry"].includes(block.kind))
    .map((block) => block.id)
    .sort();
assert.deepEqual(
  semanticIds(model.cv.blocks),
  semanticIds(mirrored.tracks.flatMap((track) => track.blocks)),
);
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
const docx = await renderDossierDocx(model, imageOptions);
const name = `opening-band-short-${rowContinuation ? "rows" : "span"}${separateTables ? "-separate" : ""}`;
await writeFile(path.join(directory, `${name}.docx`), new Uint8Array(await docx.arrayBuffer()));
const paragraphs = walkBlocks(model.cv.blocks);
const leftMm = model.cv.page.margins.left;
const ids = [
  ...sidebarOpeningFieldIds("photo-free-mirrored-main"),
  "cv.entry.schule:demo-s1.title",
  "cv.entry.schule:demo-s1.description",
];
const probes = ids.map((fieldId) => {
  const field = paragraphs.find((block) => block.kind === "paragraph" && block.id === fieldId);
  assert(field && field.kind === "paragraph", `Missing probe ${fieldId}`);
  return {
    fieldId,
    text: field.runs.map((run) => run.text).join(""),
    leftMm,
    rightMm: leftMm + table.widths[0],
  };
});
// The supported unmirrored control must pass the same continuation-field expectations.
const controlName = "opening-band-supported-control";
const controlDocx = await renderDossierDocx(source, imageOptions);
await writeFile(
  path.join(directory, `${controlName}.docx`),
  new Uint8Array(await controlDocx.arrayBuffer()),
);
const controlLeftMm = leftMm + width - table.widths[0];
await writeFile(
  path.join(directory, `${controlName}.json`),
  JSON.stringify(
    {
      fixture: controlName,
      parts: [
        { expectedPages: 1, contentBoxMm: source.cover.page.margins },
        { expectedPages: 1, contentBoxMm: source.letter.page.margins },
        {
          expectedPages: 2,
          contentBoxMm: source.cv.page.margins,
          firstPageFlowProbes: probes.map((probe) => ({
            ...probe,
            leftMm: controlLeftMm,
            rightMm: leftMm + width,
          })),
        },
      ],
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  path.join(directory, `${name}.json`),
  JSON.stringify(
    {
      fixture: name,
      architecture: `${separateTables ? "separate native tables" : "single native table"}; unmerged opening band followed by semantic rows with ${rowContinuation ? "row-coupled" : "spanning"} rail`,
      openingBlockCounts,
      parts: [
        { expectedPages: 1, contentBoxMm: model.cover.page.margins },
        { expectedPages: 1, contentBoxMm: model.letter.page.margins },
        { contentBoxMm: model.cv.page.margins, firstPageFlowProbes: probes },
      ],
      cvSemanticText: paragraphs
        .filter((block) => block.kind === "paragraph")
        .map((block) => block.runs.map((run) => run.text).join("")),
    },
    null,
    2,
  ) + "\n",
);
console.log(`Created ${name}; first continuation fields must remain on the opening CV page.`);
