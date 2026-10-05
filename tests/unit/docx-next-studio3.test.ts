import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { STUDIO_3_FIXTURES, studio3Fixture } from "../fixtures/docx-next/studio3";
describe("Studio 3 declarative editorial composition", () => {
  test("portable stress models preserve native fields and validated paint", () => {
    for (const kind of STUDIO_3_FIXTURES) {
      const input = studio3Fixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const shape of model.cover.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("palette roles drive polygon and independently rounded mint counter-field", () => {
    const model = buildDossierDocModel(studio3Fixture("custom-colors"));
    expect(model.cover.headerShapes?.[0]).toMatchObject({
      shape: "path",
      heightMm: 124,
      fill: { color: "385D58" },
      semanticText: false,
    });
    expect(model.cover.headerShapes?.[1]).toMatchObject({
      xMm: 126,
      widthMm: 84,
      cornerRadiiMm: [0, 0, 0, 36],
      fill: { color: "D48B35" },
    });
    expect(
      walkBlocks(model.cover.blocks).filter((b) => b.kind === "table").length,
    ).toBeGreaterThanOrEqual(2);
  });
  test("native first/continuation chrome and header-off paint preserve background settings", () => {
    for (const kind of ["normal", "none", "continuation"] as const) {
      const model = buildDossierDocModel(studio3Fixture(kind));
      for (const part of [model.letter, model.cv]) {
        expect(part.headerShapes?.every((s) => s.semanticText === false)).toBe(true);
        expect(new Set(part.headerShapes!.map((s) => s.id)).size).toBe(part.headerShapes!.length);
      }
    }
    // Active contact chrome keeps its paint independently of quiet CV background visibility.
    expect(buildDossierDocModel(studio3Fixture("no-motifs")).cv.headerShapes).toHaveLength(2);
    const hidden = studio3Fixture("none");
    hidden.cv.design.bgOpacity = 0;
    expect(buildDossierDocModel(hidden).cv.headerShapes).toBeUndefined();
  });
  test("explicit style overrides and native photos survive; sidebar uses shared flow", async () => {
    const input = studio3Fixture("images", "data:image/png;base64/test");
    input.settings.fieldStyles = {
      "cover.fullName": { font: "Georgia", color: "123456", italic: true },
    };
    const model = buildDossierDocModel(input);
    const name = walkBlocks(model.cover.blocks).find((b) => b.id === "cover.fullName") as Paragraph;
    expect(name.runs[0].style).toMatchObject({ font: "Georgia", color: "123456", italic: true });
    expect(walkBlocks(model.cover.blocks).some((b) => b.kind === "image")).toBe(true);
    expect(
      buildDossierDocModel(studio3Fixture("sidebar")).cv.blocks.some(
        (block) => block.kind === "parallel-flow",
      ),
    ).toBe(true);
  });
});
