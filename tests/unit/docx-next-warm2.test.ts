import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { WARM_2_FIXTURES, warm2Fixture } from "../fixtures/docx-next/warm2";
describe("Warm 2 shared curved stationery and native centered hero", () => {
  test("all portable stress fixtures retain deterministic models and valid nonsemantic curves", () => {
    for (const kind of WARM_2_FIXTURES) {
      const input = warm2Fixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const shape of model.cover.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("curved teal and amber fields follow custom palettes without semantic text", () => {
    const model = buildDossierDocModel(warm2Fixture("custom-colors"));
    expect(model.cover.headerShapes?.[0]).toMatchObject({
      shape: "rect",
      heightMm: 94,
      cornerRadiiMm: [0, 0, 72, 0],
      fill: { color: "385D58" },
    });
    expect(model.cover.headerShapes?.[1]).toMatchObject({
      shape: "path",
      xMm: 134,
      yMm: 0,
      widthMm: 76,
      fill: { color: "D48B35" },
    });
    expect(model.cover.headerShapes?.every((s) => s.semanticText === false)).toBe(true);
  });
  test("quiet motifs repeat beside native contact stories and background visibility is independent", () => {
    for (const kind of ["normal", "none", "continuation"] as const) {
      const model = buildDossierDocModel(warm2Fixture(kind));
      for (const part of [model.letter, model.cv]) {
        expect(part.artwork.some((a) => a.id.includes(".band."))).toBe(false);
        expect(part.headerShapes).toHaveLength(4);
        expect(new Set(part.headerShapes!.map((s) => s.id)).size).toBe(4);
        expect(part.headerShapes?.[1]).toMatchObject({ yMm: 3, heightMm: 28 });
        expect(part.headerShapes?.[2].repeat).toBe("continuation");
      }
    }
    expect(buildDossierDocModel(warm2Fixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("native photos, rich tables and explicit user typography survive; CV sidebar uses shared flow", async () => {
    const input = warm2Fixture("images", "data:image/png;base64/test");
    input.settings.fieldStyles = {
      "cover.fullName": { font: "Georgia", color: "123456", italic: true },
    };
    const model = buildDossierDocModel(input);
    const name = walkBlocks(model.cover.blocks).find((b) => b.id === "cover.fullName") as Paragraph;
    expect(name.runs[0].style).toMatchObject({ font: "Georgia", color: "123456", italic: true });
    expect(walkBlocks(model.cover.blocks).some((b) => b.kind === "image")).toBe(true);
    expect(
      walkBlocks(buildDossierDocModel(warm2Fixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
    expect(
      buildDossierDocModel(warm2Fixture("sidebar")).cv.blocks.some(
        (block) => block.kind === "parallel-flow",
      ),
    ).toBe(true);
  });
});
