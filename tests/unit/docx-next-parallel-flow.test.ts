import { expect, test } from "bun:test";
import { parallelFlowFixture } from "../fixtures/docx-next/parallel-flow";
import { parallelFlowTable } from "../../src/lib/docx-next/parallel-flow";
import { walkBlocks, type ParallelFlowBlock } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { planCellRowSpans } from "../../src/lib/docx-next/native-cell";

test("parallel tracks retain semantic IDs, editable native paragraphs and independent splittable flow", async () => {
  const model = parallelFlowFixture("both-long");
  const ids = walkBlocks(model.cv.blocks).map((block) => block.id);
  expect(ids).toContain("parallel.side:54");
  expect(ids.some((id) => id.startsWith("cv.entry.erfahrung"))).toBe(true);
  const blob = await renderDossierDocx(model);
  const doc = new TextDecoder().decode(
    readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(
      (entry) => entry.name === "word/document.xml",
    )!.bytes,
  );
  expect(doc).toContain('w:tblCaption w:val="parallel.proof"');
  expect(doc).toContain('w:fill="EDF2F7"');
  expect(doc).toContain('w:tag w:val="parallel.side:54"');
  expect(doc).not.toContain("<w:cantSplit");
  expect(doc).not.toContain("<w:txbxContent");
});

test("parallel flow rejects unusable tracks and unsupported explicit pagination/floating content", () => {
  const flow = parallelFlowFixture("short").cv.blocks[0] as ParallelFlowBlock;
  expect(() => parallelFlowTable(flow, 50)).toThrow("insufficient text width");
  flow.tracks[0].blocks = [{ kind: "page-break", id: "parallel.page2" }];
  expect(() => parallelFlowTable(flow, 170)).toThrow(
    "unsupported parallel-flow content parallel.page2",
  );
  flow.tracks[0].blocks = [
    { kind: "column-flow", id: "parallel.columns", count: 2, gapMm: 4, blocks: [] },
  ];
  expect(() => parallelFlowTable(flow, 170)).toThrow(
    "unsupported parallel-flow content parallel.columns",
  );
});

test("semantic row alignment retains identity, groups entry metadata and leaves exhausted tracks empty", () => {
  const flow = parallelFlowFixture("main-long").cv.blocks[0] as ParallelFlowBlock;
  flow.rowAlignment = "semantic";
  const original = JSON.stringify(flow);
  const table = parallelFlowTable(flow, 170);
  expect(table.rows.length).toBeGreaterThan(60);
  expect(table.rows.every((row) => row.keepTogether)).toBe(true);
  expect(table.rows.at(-1)!.cells[0]).toEqual([]);
  expect(table.rows.every((row) => row.cells[1].length === 0)).toBe(true);
  const renderedIds = walkBlocks([table]).map((block) => block.id);
  expect(new Set(renderedIds).size).toBe(renderedIds.length);
  expect(renderedIds).toEqual(expect.arrayContaining(walkBlocks([flow]).map((block) => block.id)));
  expect(
    walkBlocks([table])
      .filter((block) => block.kind === "entry")
      .every((block) => block.kind === "entry" && !block.keepTogether),
  ).toBe(true);
  expect(JSON.stringify(flow)).toBe(original);
  expect(table.rows[0].cellDecorations![0]).toMatchObject({ paddingTopMm: 3, paddingBottomMm: 0 });
  expect(table.rows.at(-1)!.cellDecorations![0]).toMatchObject({
    paddingTopMm: 0,
    paddingBottomMm: 3,
  });
});

test("semantic rows attach section heading to its first entry using one native outer row", async () => {
  const model = parallelFlowFixture("short");
  const flow = model.cv.blocks[0] as ParallelFlowBlock;
  flow.rowAlignment = "semantic";
  const table = parallelFlowTable(flow, 170);
  const school = table.rows
    .flatMap((row) => row.cells[2])
    .find((block) => block.kind === "section" && block.id === "cv.section.schule");
  expect(school).toMatchObject({ kind: "section", blocks: [{ kind: "entry" }] });
  const blob = await renderDossierDocx(model);
  const doc = new TextDecoder().decode(
    readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(
      (entry) => entry.name === "word/document.xml",
    )!.bytes,
  );
  expect(doc).toContain("<w:cantSplit/>");
  expect(doc).toContain('w:tag w:val="cv.entry.erfahrung:demo-p2.title"');
  expect(doc).not.toContain('w:tblCaption w:val="cv.entry.');
  expect(doc).not.toContain("<w:txbxContent");
});

test("asymmetric cell padding rejects invalid geometry rather than dropping it", () => {
  const flow = parallelFlowFixture("short").cv.blocks[0] as ParallelFlowBlock;
  flow.tracks[0].decoration!.paddingTopMm = -1;
  expect(() => parallelFlowTable(flow, 170)).toThrow("invalid cell decoration");
});

test("a spanning track retains one uninterrupted semantic cell beside native entry rows", async () => {
  const model = parallelFlowFixture("main-long");
  const flow = model.cv.blocks[0] as ParallelFlowBlock;
  flow.rowAlignment = "semantic";
  flow.spanningTracks = [0];
  const table = parallelFlowTable(flow, 170);
  expect(table.rows[0].cells[0]).toEqual(flow.tracks[0].blocks);
  expect(table.rows[0].cellRowSpans![0]).toBe(table.rows.length);
  expect(table.rows.slice(1).every((row) => row.cells[0].length === 0)).toBe(true);
  expect(planCellRowSpans(table)[0][0]).toBe("restart");
  expect(planCellRowSpans(table).at(-1)![0]).toBe("continue");
  const blob = await renderDossierDocx(model);
  const doc = new TextDecoder().decode(
    readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(
      (entry) => entry.name === "word/document.xml",
    )!.bytes,
  );
  expect(doc).toContain('<w:vMerge w:val="restart"/>');
  expect(doc.match(/w:tag w:val="parallel.side:0"/g)?.length).toBe(1);
  flow.tracks.reverse();
  flow.spanningTracks = [1];
  const mirrored = parallelFlowTable(flow, 170);
  expect(mirrored.rows[0].cellRowSpans![2]).toBe(mirrored.rows.length);
  expect(planCellRowSpans(mirrored)[0][2]).toBe("restart");
});

test("spans reject overlapping content, overflow, count mismatches and invalid track selection", () => {
  const flow = parallelFlowFixture("main-long").cv.blocks[0] as ParallelFlowBlock;
  flow.rowAlignment = "semantic";
  flow.spanningTracks = [0];
  const table = parallelFlowTable(flow, 170);
  table.rows[1].cells[0] = flow.tracks[0].blocks;
  expect(() => planCellRowSpans(table)).toThrow("overlapping cell row span");
  table.rows[1].cells[0] = [];
  table.rows[0].cellRowSpans![0]++;
  expect(() => planCellRowSpans(table)).toThrow("invalid cell row span");
  table.rows[0].cellRowSpans = [];
  expect(() => planCellRowSpans(table)).toThrow("invalid cell row span count");
  for (const tracks of [[0, 1], [0, 0], [-1], [2], [NaN]]) {
    flow.spanningTracks = tracks;
    expect(() => parallelFlowTable(flow, 170)).toThrow("invalid parallel flow");
  }
});

test("atomic groups explicitly reject spanning-cell composition instead of losing or ungrouping text", () => {
  const flow = parallelFlowFixture("short").cv.blocks[0] as ParallelFlowBlock;
  flow.rowAlignment = "semantic";
  flow.spanningTracks = [0];
  flow.tracks[0].blocks = [
    { kind: "entry", id: "atomic-side", keepTogether: true, blocks: flow.tracks[0].blocks },
  ];
  expect(() => parallelFlowTable(flow, 170)).toThrow("spanning track cannot contain atomic groups");
  flow.spanningTracks = [];
  expect(parallelFlowTable(flow, 170).rows.every((row) => row.keepTogether)).toBe(true);
});

test("section continuations retain authored indentation and emit their semantic heading once", () => {
  const flow = parallelFlowFixture("main-long").cv.blocks[0] as ParallelFlowBlock;
  const school = flow.tracks[1].blocks.find(
    (block) => block.kind === "section" && block.id === "cv.section.schule",
  );
  if (school?.kind !== "section") throw new Error("Missing school fixture");
  school.contentIndentMm = 7;
  flow.rowAlignment = "semantic";
  const table = parallelFlowTable(flow, 170);
  const sections = walkBlocks([table]).filter(
    (block) =>
      block.kind === "section" &&
      (block.id === school.id || block.id.startsWith(school.id + ".flow:")),
  );
  expect(sections.length).toBe(65);
  expect(sections.every((block) => block.kind === "section" && block.contentIndentMm === 7)).toBe(
    true,
  );
  expect(sections.filter((block) => block.kind === "section" && block.heading).length).toBe(1);
});
