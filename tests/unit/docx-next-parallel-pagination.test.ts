import { expect, test } from "bun:test";
import {
  PARALLEL_PAGINATION_CASES,
  parallelPaginationFixture,
} from "../fixtures/docx-next/parallel-pagination";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";

test("native pagination counterexamples retain the source tail and vary only declared geometry/chrome/grouping", async () => {
  for (const value of PARALLEL_PAGINATION_CASES) {
    const { model, flow } = parallelPaginationFixture(value);
    expect(model.cv.page.margins.top).toBe(value.topMm);
    expect(model.cv.blocks[0].kind).toBe("table");
    const paragraphs = walkBlocks(flow.tracks.flatMap((track) => track.blocks));
    expect(paragraphs.some((p) => p.id === "cv.entry.erfahrung:demo-p2.title")).toBe(true);
    expect(paragraphs.some((p) => p.id === "cv.entry.referenzen:demo-r1.contact")).toBe(true);
    const blob = await renderDossierDocx(model);
    const doc = new TextDecoder().decode(
      readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(
        (entry) => entry.name === "word/document.xml",
      )!.bytes,
    );
    expect(doc).toContain("Schnupperlehre Mediamatik");
    expect(doc).toContain("079 555 12 34");
    expect(doc.includes("<w:cantSplit")).toBe(value.entry === "row");
    expect(doc).not.toContain("<w:txbxContent");
  }
});
