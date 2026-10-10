import { expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { createDossierDocxNextBlob } from "../../src/lib/docx-next/export";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type TableBlock } from "../../src/lib/docx-next/model";
import { SIDEBAR_FIXTURES, sidebarFixture } from "../fixtures/docx-next/sidebar";
import { briefFixture } from "../fixtures/docx-next/brief";
import { paragraphSignature } from "../fixtures/docx-next/sidebar-floating";

const diagnostic = { cvSidebarComposition: "body-stories" as const };

test("shared sidebar lowering preserves authored paragraphs, physical tracks and immutable inputs", () => {
  for (const kind of SIDEBAR_FIXTURES) {
    const input = sidebarFixture(kind),
      before = structuredClone(input);
    const old = buildDossierDocModel(input);
    const model = buildDossierDocModel(input, diagnostic);
    expect(input).toEqual(before);
    expect(buildDossierDocModel(JSON.parse(JSON.stringify(input)), diagnostic)).toEqual(model);
    expect(buildDossierDocModel(input)).toEqual(old);
    expect(paragraphSignature(model.cv.blocks)).toEqual(paragraphSignature(old.cv.blocks));
    expect(model.cover).toEqual(old.cover);
    expect(model.letter).toEqual(old.letter);
    expect(model.cv.page).toEqual(old.cv.page);
    const flow = old.cv.blocks.find((block) => block.kind === "parallel-flow")!;
    const table = model.cv.blocks.find((block) => block.kind === "table") as TableBlock;
    expect(table.bodyBoundary).toBe("paragraph");
    expect(table.bodyBoundaryKeepNext).toBe(true);
    expect(table.position).toBeUndefined();
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].keepTogether).toBe(false);
    expect(table.rows[0].cellRowSpans).toBeUndefined();
    expect(
      walkBlocks(model.cv.blocks).some((block) => block.kind === "entry" && block.keepTogether),
    ).toBe(false);
    expect(table.rows[0].cells.filter((_, index) => index !== 1).map(paragraphSignature)).toEqual(
      flow.tracks.map((track) => paragraphSignature(track.blocks)),
    );
  }
});

test("diagnostic composition uses the shared export path and stays blocked without its explicit gate", async () => {
  const input = sidebarFixture("both-long"),
    before = structuredClone(input);
  await expect(createDossierDocxNextBlob(input, diagnostic)).rejects.toThrow(
    "body boundary is unaccepted",
  );
  const options = { ...diagnostic, allowUnacceptedModelIssues: true };
  const blob = await createDossierDocxNextBlob(input, options);
  const model = buildDossierDocModel(input, diagnostic);
  expect(new Uint8Array(await blob.arrayBuffer())).toEqual(
    new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer()),
  );
  expect(input).toEqual(before);
  model.issues = [];
  await expect(renderDossierDocx(model)).rejects.toThrow("body boundary is unaccepted");
  for (const composition of [null, "semantic-rows", true, {}])
    expect(() =>
      buildDossierDocModel(input, { cvSidebarComposition: composition } as never),
    ).toThrow();
  expect(() => buildDossierDocModel(briefFixture(), diagnostic)).toThrow();
});

test("whole stories keep native picture ownership and reject invalid source geometry", () => {
  const input = sidebarFixture("photo-free-mirrored-main");
  // Body stories no longer use the old, picture-before-span restriction.
  const model = buildDossierDocModel(input, diagnostic);
  expect(walkBlocks(model.cv.blocks).some((block) => block.kind === "image-zone")).toBe(true);
  input.settings.cvPhotoPlacement!.xMm = 60;
  expect(() => buildDossierDocModel(input, diagnostic)).toThrow(
    "free photo must fit one native track",
  );
  const pageStart = sidebarFixture();
  pageStart.cv.data.sectionLayouts = { schule: { page: 2 } };
  expect(() => buildDossierDocModel(pageStart, diagnostic)).toThrow(
    "unsupported parallel-flow content",
  );
});

test("a malformed body table cannot bypass the sidebar structure gate", async () => {
  for (const mutate of [
    (table: TableBlock) => {
      table.id = "other.table";
    },
    (table: TableBlock) => {
      delete table.bodyBoundary;
    },
    (table: TableBlock) => {
      table.bodyBoundaryKeepNext = false;
    },
    (table: TableBlock) => {
      table.position = { xMm: 20, yMm: 20 };
    },
    (table: TableBlock) => {
      table.rows[0].keepTogether = true;
    },
    (table: TableBlock) => {
      table.rows.push(structuredClone(table.rows[0]));
    },
    (table: TableBlock) => {
      table.rows[0].cellRowSpans = [1, 1, 1];
    },
    (table: TableBlock) => {
      table.rows[0].cells.pop();
    },
    (table: TableBlock) => {
      table.rows[0].cells[1] = structuredClone(table.rows[0].cells[0]);
    },
  ]) {
    const model = buildDossierDocModel(sidebarFixture(), diagnostic);
    mutate(model.cv.blocks.find((block) => block.kind === "table") as TableBlock);
    await expect(renderDossierDocx(model, { allowUnacceptedModelIssues: true })).rejects.toThrow(
      "requires native parallel flow",
    );
  }
});
