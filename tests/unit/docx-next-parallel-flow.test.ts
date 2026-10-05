import { expect, test } from "bun:test";
import { parallelFlowFixture } from "../fixtures/docx-next/parallel-flow";
import { parallelFlowTable } from "../../src/lib/docx-next/parallel-flow";
import { walkBlocks, type ParallelFlowBlock } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";

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
