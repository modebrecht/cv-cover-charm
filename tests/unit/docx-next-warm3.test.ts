import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { WARM_3_FIXTURES, warm3Fixture } from "../fixtures/docx-next/warm3";
describe("Warm 3 shared organic counter-field and per-part stationery", () => {
  test("all portable stress fixtures retain deterministic models and valid nonsemantic curves", () => {
    for (const kind of WARM_3_FIXTURES) {
      const input = warm3Fixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const shape of model.cover.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("curved teal and amber fields follow custom palettes without semantic text", () => {
    const model = buildDossierDocModel(warm3Fixture("custom-colors"));
    expect(model.cover.headerShapes?.[0]).toMatchObject({
      shape: "rect",
      heightMm: 72,
      cornerRadiiMm: [0, 0, 34, 0],
      fill: { color: "385D58" },
    });
    expect(model.cover.headerShapes?.[1]).toMatchObject({
      shape: "rect",
      xMm: 126,
      yMm: 0,
      widthMm: 84,
      cornerRadiiMm: [0, 0, 34, 34],
      fill: { color: "D48B35" },
    });
    expect(model.cover.headerShapes?.every((s) => s.semanticText === false)).toBe(true);
  });
  test("quiet motifs repeat beside native contact stories and background visibility is independent", () => {
    for (const kind of ["normal", "none", "continuation"] as const) {
      const model = buildDossierDocModel(warm3Fixture(kind));
      for (const part of [model.letter, model.cv]) {
        expect(part.artwork.some((a) => a.id.includes(".band."))).toBe(false);
        expect(part.headerShapes).toHaveLength(4);
        expect(new Set(part.headerShapes!.map((s) => s.id)).size).toBe(4);
        expect(part.headerShapes?.[1]).toMatchObject({
          yMm: 0,
          heightMm: part.id === "letter" ? 7 : 10,
        });
        expect(part.headerShapes?.[2].repeat).toBe("continuation");
      }
    }
    expect(buildDossierDocModel(warm3Fixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("native photos, rich tables and explicit user typography survive; CV sidebar is blocked", async () => {
    const input = warm3Fixture("images", "data:image/png;base64/test");
    input.settings.fieldStyles = {
      "cover.fullName": { font: "Georgia", color: "123456", italic: true },
    };
    const model = buildDossierDocModel(input);
    const name = walkBlocks(model.cover.blocks).find((b) => b.id === "cover.fullName") as Paragraph;
    expect(name.runs[0].style).toMatchObject({ font: "Georgia", color: "123456", italic: true });
    expect(walkBlocks(model.cover.blocks).some((b) => b.kind === "image")).toBe(true);
    expect(
      walkBlocks(buildDossierDocModel(warm3Fixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
    await expect(
      renderDossierDocx(buildDossierDocModel(warm3Fixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
  });
});
