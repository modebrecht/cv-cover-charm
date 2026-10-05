import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { EDEL_FIXTURES, edelFixture } from "../fixtures/docx-next/edel";
describe("Edel light stationery and independently editable content", () => {
  test("portable stress models retain deterministic native blocks and valid paint", () => {
    for (const kind of EDEL_FIXTURES) {
      const input = edelFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [model.cover, model.letter, model.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("light picker palette replaces historical dark defaults; authored palettes and frames survive", () => {
    const model = buildDossierDocModel(edelFixture());
    expect(model.cover.artwork.find((a) => a.id.endsWith(".paper"))?.fill.color).toBe("FCFBF8");
    const coverFrames = model.cover.headerShapes!.filter((s) => !s.fill && s.shape === "rect");
    expect(coverFrames.map((s) => s.xMm)).toEqual([12, 15, 12, 15]);
    expect(coverFrames.every((s) => s.stroke.color === "8D6B2D")).toBe(true);
    const custom = buildDossierDocModel(edelFixture("custom-colors"));
    expect(
      custom.cover
        .headerShapes!.filter((s) => s.shape === "rect")
        .every((s) => s.stroke.color === "6B948C"),
    ).toBe(true);
    expect(
      custom.cover.headerShapes!.find((s) => s.id === "cover.decor-center-line"),
    ).toMatchObject({ xMm: 85, yMm: 196, widthMm: 40, opacity: 0.7 });
  });
  test("both interior frame stories remain independent of contact chrome and CV visibility", () => {
    for (const kind of ["normal", "compact", "none", "continuation"] as const) {
      const model = buildDossierDocModel(edelFixture(kind));
      for (const part of [model.letter, model.cv]) {
        expect(part.headerShapes).toHaveLength(4);
        expect(part.headerShapes!.map((s) => s.xMm)).toEqual([9, 12, 9, 12]);
        expect(part.headerShapes![2].repeat).toBe("continuation");
        expect(part.headerShapes!.every((s) => !s.fill && s.semanticText === false)).toBe(true);
        expect(part.artwork.some((a) => a.id.includes(".band."))).toBe(false);
      }
    }
    expect(buildDossierDocModel(edelFixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("source circle crop and semantic styles remain native; rich content and blockers are explicit", async () => {
    const input = edelFixture("images", "data:image/png;base64/test");
    input.cover.blocks.find((b) => b.id === "name")!.style.opacity = 1;
    input.settings.fieldStyles = {
      "cover.fullName": { font: "Arial", color: "123456", italic: true },
    };
    const model = buildDossierDocModel(input),
      blocks = walkBlocks(model.cover.blocks);
    expect(blocks.find((b) => b.id === "cover.photo")).toMatchObject({
      kind: "image",
      widthMm: 42,
      frame: { radiusMm: 999, heightRatio: 1 },
    });
    expect(
      (blocks.find((b) => b.id === "cover.fullName") as Paragraph).runs[0].style,
    ).toMatchObject({ font: "Arial", color: "123456", italic: true });
    expect(
      walkBlocks(buildDossierDocModel(edelFixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
    await expect(
      renderDossierDocx(buildDossierDocModel(edelFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
  });
});
