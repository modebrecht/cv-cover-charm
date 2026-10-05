import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import {
  authoredPolygonPath,
  validateDecoration,
  shapePathPoints,
} from "../../src/lib/docx-next/decoration";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { DIAGONAL_FIXTURES, diagonalFixture } from "../fixtures/docx-next/diagonal";
describe("Diagonal authored geometry and reusable native callout surfaces", () => {
  test("all portable stress models retain native content and validated paint", () => {
    for (const kind of DIAGONAL_FIXTURES) {
      const input = diagonalFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [model.cover, model.letter, model.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("bounded polygon shorthand closes correctly and rejects unsupported SVG grammar", () => {
    expect(authoredPolygonPath("M0 0 H100 L0 100 Z")).toBe("M 0 0 L 100 0 L 0 100 L 0 0");
    expect(authoredPolygonPath("M100 0 V100 H0 Z")).toBe("M 100 0 L 100 100 L 0 100 L 100 0");
    expect(authoredPolygonPath("M 0 0 L 100 0 L 0 100")).toBe("M 0 0 L 100 0 L 0 100");
    for (const invalid of [
      "M0 0 H101 L0 100 Z",
      "M0 0 H100 L0 100 Z L0 0",
      "M0 0 H100 C0 0 0 0 100 100 Z",
      "M0 0 H100 L0 100 <text/>",
      "M0 0 H100 M0 100 Z",
      "M0 0 H NaN",
      "H100 L0 100 Z",
    ])
      expect(() => authoredPolygonPath(invalid)).toThrow("authored polygon");
    expect(() => shapePathPoints("M0 0 C0 0 0 0 100 100")).toThrow("decorative path");
  });
  test("source triangles remain authoritative after user position, size and palette edits", () => {
    const input = diagonalFixture("custom-colors"),
      block = input.cover.blocks.find((b) => b.id === "decor-diagonal-top")!;
    Object.assign(block.style, { x: 12, y: 9, w: 100, ratio: 0.8, opacity: 0.5 });
    const model = buildDossierDocModel(input),
      shape = model.cover.headerShapes!.find((s) => s.id === "cover.decor-diagonal-top");
    expect(shape).toMatchObject({
      xMm: 12,
      yMm: 9,
      widthMm: 100,
      heightMm: 80,
      opacity: 0.5,
      fill: { color: "385D58" },
      path: "M 0 0 L 100 0 L 0 100 L 0 0",
    });
    expect(model.cover.headerShapes).toHaveLength(2);
  });
  test("right contact cell provides a native growing backdrop; saved typography wins", () => {
    const input = diagonalFixture();
    input.cover.blocks.find((block) => block.id === "beilagen")!.style.opacity = 1;
    input.settings.fieldStyles = { "cover.beilagen": { color: "123456", italic: true } };
    const model = buildDossierDocModel(input),
      blocks = walkBlocks(model.cover.blocks);
    const surface = blocks.find((b) => b.id === "cover.composition.row:2.cell:1.surface");
    expect(surface).toMatchObject({
      kind: "table",
      decoration: { fillColor: "156082", paddingXMm: 3, paddingYMm: 3 },
    });
    expect(
      (blocks.find((b) => b.id === "cover.beilagen") as Paragraph).runs[0].style,
    ).toMatchObject({ color: "123456", italic: true });
    expect(model.cover.blocks.filter((b) => b.kind === "table")).toHaveLength(3);
  });
  test("interior corner pairs repeat independently of contact chrome and CV visibility", () => {
    for (const kind of ["normal", "compact", "none", "continuation"] as const) {
      const model = buildDossierDocModel(diagonalFixture(kind));
      for (const part of [model.letter, model.cv]) {
        expect(part.headerShapes).toHaveLength(4);
        expect(new Set(part.headerShapes!.map((s) => s.id)).size).toBe(4);
        expect(part.headerShapes?.[2].repeat).toBe("continuation");
      }
      expect(model.letter.headerShapes?.[1]).toMatchObject({
        xMm: 188,
        yMm: 282,
        widthMm: 22,
        heightMm: 15,
        opacity: 0.92,
      });
      expect(model.cv.headerShapes?.[1]).toMatchObject({
        xMm: 180,
        yMm: 275,
        widthMm: 30,
        heightMm: 22,
      });
    }
    expect(buildDossierDocModel(diagonalFixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("photos and rich tables remain native; sidebar uses shared flow", async () => {
    expect(
      walkBlocks(
        buildDossierDocModel(diagonalFixture("images", "data:image/png;base64/test")).cover.blocks,
      ).some((b) => b.kind === "image"),
    ).toBe(true);
    expect(
      walkBlocks(buildDossierDocModel(diagonalFixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
    expect(
      buildDossierDocModel(diagonalFixture("sidebar")).cv.blocks.some(
        (block) => block.kind === "parallel-flow",
      ),
    ).toBe(true);
  });
});
