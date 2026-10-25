import { expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { createDossierDocxNextBlob } from "../../src/lib/docx-next/export";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type TableBlock } from "../../src/lib/docx-next/model";
import { SIDEBAR_FIXTURES, sidebarFixture } from "../fixtures/docx-next/sidebar";
import { briefFixture } from "../fixtures/docx-next/brief";
import { paragraphSignature } from "../fixtures/docx-next/sidebar-floating";
import { tableColumnWidths } from "../../src/lib/docx-next/layouts";
import { readZipEntries } from "../../src/lib/docx-next/zip";

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
    expect(table.bodyBoundary).toBe("section-start");
    expect(table.bodyBoundaryKeepNext).toBeUndefined();
    expect(table.position).toBeUndefined();
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].keepTogether).toBe(false);
    expect(table.rows[0].cellRowSpans).toBeUndefined();
    expect(table.bodyBoundaryLeadMm ?? 0).toBe(flow.leadingInsetMm ?? 0);
    expect(
      table.rows[0].cellDecorations!.map((paint) => paint?.paddingTopMm ?? paint?.paddingYMm),
    ).toEqual([
      flow.tracks[0].decoration?.paddingYMm ?? 0,
      0,
      flow.tracks[1].decoration?.paddingYMm ?? 0,
    ]);
    expect(
      walkBlocks(model.cv.blocks).some((block) => block.kind === "entry" && block.keepTogether),
    ).toBe(false);
    expect(table.rows[0].cells.filter((_, index) => index !== 1).map(paragraphSignature)).toEqual(
      flow.tracks.map((track) => paragraphSignature(track.blocks)),
    );
  }
});

test("legacy paragraph boundaries still reject invalid lead geometry", async () => {
  for (const value of [NaN, Infinity, -1, 300, "64", null]) {
    const model = buildDossierDocModel(sidebarFixture("chrome-leading"), diagnostic);
    Object.assign(model.cv.blocks.find((block) => block.kind === "table")!, {
      bodyBoundary: "paragraph",
      bodyBoundaryKeepNext: true,
      bodyBoundaryLeadMm: value,
    });
    await expect(renderDossierDocx(model, { allowUnacceptedModelIssues: true })).rejects.toThrow(
      "invalid table body boundary lead",
    );
  }
});

test("free main-track photos keep authored coordinates and wrap instead of preceding the CV header", async () => {
  for (const kind of [
    "photo-free-portrait",
    "photo-free-main",
    "photo-free-mirrored-main",
    "photo-free-low",
  ] as const) {
    const input = sidebarFixture(kind);
    const before = structuredClone(input);
    const model = buildDossierDocModel(input, diagnostic);
    const table = model.cv.blocks.find((block) => block.kind === "table") as TableBlock;
    const cellIndex = input.settings.sidebarSide === "right" ? 0 : 2;
    const cell = table.rows[0].cells[cellIndex];
    const image = cell[0];
    expect(image.kind).toBe("image");
    if (image.kind !== "image") throw new Error("Missing main-track picture");
    expect(image.placement).toBe("free");
    expect(image.coordinateOrigin).toBe("content");
    expect(image.sourceLayout?.xMm).toBe(input.settings.cvPhotoPlacement!.xMm);
    expect(image.sourceLayout?.yMm).toBe(input.settings.cvPhotoPlacement!.yMm);
    expect(image.frame?.zoom).toBe(input.settings.cvPhotoStyle!.zoom);
    const available =
      model.cv.page.widthMm - model.cv.page.margins.left - model.cv.page.margins.right;
    const widths = tableColumnWidths(table, available);
    const mainLeft =
      model.cv.page.margins.left + widths.slice(0, cellIndex).reduce((a, b) => a + b, 0);
    const physicalX =
      input.settings.sidebarSide === "right"
        ? model.cv.page.widthMm - input.settings.cvPhotoPlacement!.xMm - image.widthMm
        : input.settings.cvPhotoPlacement!.xMm;
    expect(mainLeft + image.xMm).toBeCloseTo(physicalX, 8);
    expect(cell[1].id).toBe("cv.documentTitle");
    expect(input).toEqual(before);
  }
  const model = buildDossierDocModel(sidebarFixture("both-long"), diagnostic);
  const bytes = new Uint8Array(
    await (await renderDossierDocx(model, { allowUnacceptedModelIssues: true })).arrayBuffer(),
  );
  const xml = new TextDecoder().decode(
    readZipEntries(bytes).find((part) => part.name === "word/document.xml")!.bytes,
  );
  const caption = xml.indexOf('w:tblCaption w:val="cv.sidebar"');
  const start = xml.lastIndexOf("<w:tbl>", caption);
  expect(xml.slice(0, start).endsWith("</w:sectPr></w:pPr></w:p>")).toBe(true);
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
  expect(
    walkBlocks(model.cv.blocks).some(
      (block) => block.kind === "image" && block.placement === "free",
    ),
  ).toBe(true);
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
