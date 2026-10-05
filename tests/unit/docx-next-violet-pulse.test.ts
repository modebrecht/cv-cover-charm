import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { VIOLET_PULSE_FIXTURES, violetPulseFixture } from "../fixtures/docx-next/violet-pulse";
describe("Violet Pulse reuses shared contours and native paper chrome", () => {
  test("all portable stress fixtures retain deterministic models and valid nonsemantic curves", () => {
    for (const kind of VIOLET_PULSE_FIXTURES) {
      const input = violetPulseFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const shape of model.cover.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("palette-bound diagonal contour and radial motifs contain no semantic text", () => {
    const model = buildDossierDocModel(violetPulseFixture("custom-colors"));
    expect(model.cover.headerShapes?.[0]).toMatchObject({
      shape: "path",
      xMm: -20,
      yMm: -8,
      widthMm: 250,
      heightMm: 118,
      fill: { color: "385D58", endColor: "D48B35" },
    });
    expect(model.cover.headerShapes?.filter((s) => s.fill?.radialFade)).toHaveLength(2);
    expect(model.cover.headerShapes?.every((s) => s.semanticText === false)).toBe(true);
  });
  test("quiet motifs repeat beside native contact stories and background visibility is independent", () => {
    for (const kind of ["normal", "none", "continuation"] as const) {
      const model = buildDossierDocModel(violetPulseFixture(kind));
      for (const part of [model.letter, model.cv]) {
        expect(part.artwork.some((a) => a.id.includes(".band."))).toBe(false);
        expect(part.headerShapes).toHaveLength(4);
        expect(new Set(part.headerShapes!.map((s) => s.id)).size).toBe(4);
        expect(part.headerShapes?.[1]).toMatchObject({ yMm: 3, heightMm: 1.2 });
        expect(part.headerShapes?.[2].repeat).toBe("continuation");
      }
    }
    expect(buildDossierDocModel(violetPulseFixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("native photos, rich tables and explicit user typography survive; CV sidebar is blocked", async () => {
    const input = violetPulseFixture("images", "data:image/png;base64/test");
    input.settings.fieldStyles = {
      "cover.fullName": { font: "Georgia", color: "123456", italic: true },
    };
    const model = buildDossierDocModel(input);
    const name = walkBlocks(model.cover.blocks).find((b) => b.id === "cover.fullName") as Paragraph;
    expect(name.runs[0].style).toMatchObject({ font: "Georgia", color: "123456", italic: true });
    expect(walkBlocks(model.cover.blocks).some((b) => b.kind === "image")).toBe(true);
    expect(
      walkBlocks(buildDossierDocModel(violetPulseFixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
    await expect(
      renderDossierDocx(buildDossierDocModel(violetPulseFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
  });
});
