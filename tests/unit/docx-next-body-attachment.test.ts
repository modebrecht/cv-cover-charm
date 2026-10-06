import { expect, test } from "bun:test";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import {
  SIDEBAR_BODY_CASES,
  sidebarBodyAttachmentFixture,
} from "../fixtures/docx-next/sidebar-body-attachment";

test("body attachment ownership controls preserve complete paragraphs, flags and the same text lane", () => {
  const paragraphs = (blocks: Parameters<typeof walkBlocks>[0]) =>
    walkBlocks(blocks).filter((b) => b.kind === "paragraph");
  for (const value of SIDEBAR_BODY_CASES) {
    const { model, fixture } = sidebarBodyAttachmentFixture(value);
    const control = sidebarBodyAttachmentFixture({ ...value, mode: "grid" });
    expect(paragraphs(model.cv.blocks)).toEqual(paragraphs(control.model.cv.blocks));
    expect(fixture.lane).toEqual(control.fixture.lane);
    expect(fixture.cvSemanticText).toEqual(control.fixture.cvSemanticText);
    expect(fixture.openingFields.map((field) => field.fieldId)).toEqual(
      control.fixture.openingFields.map((field) => field.fieldId),
    );
    const table = model.cv.blocks[0];
    if (value.mode === "body") {
      expect(model.cv.page.margins.left).toBe(fixture.lane.leftMm);
      expect(model.cv.page.widthMm - model.cv.page.margins.right).toBe(fixture.lane.rightMm);
    } else {
      if (table.kind !== "table") throw Error("Missing native ownership table");
      expect(
        table.rows.every((row) => row.cells.length === (value.mode === "single-column" ? 1 : 3)),
      ).toBe(true);
      if (value.mode !== "grid")
        expect(table.rows.every((row) => row.cellRowSpans === undefined)).toBe(true);
    }
  }
});

test("all 24 ownership controls retain immutable unique identities and byte-identical JSON packages", async () => {
  for (const value of SIDEBAR_BODY_CASES) {
    const { model } = sidebarBodyAttachmentFixture(value);
    const before = structuredClone(model);
    const source = new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer());
    const restored = new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(model)))).arrayBuffer(),
    );
    expect(restored).toEqual(source);
    expect(model).toEqual(before);
    const ids = walkBlocks(model.cv.blocks).map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  }
});
