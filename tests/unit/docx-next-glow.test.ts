import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { GLOW_FIXTURES, glowFixture } from "../fixtures/docx-next/glow";
describe("Glow generic luminous stationery", () => {
  test("scenarios preserve editable semantic models and portable identities", () => {
    for (const kind of GLOW_FIXTURES) {
      const input = glowFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      expect(model.templateId).toBe("glow");
    }
  });
  test("radial color-to-transparency is validated, palette-bound, and scopes native stories", () => {
    const model = buildDossierDocModel(glowFixture("none"));
    expect(model.cv.headerShapes?.map((s) => s.repeat)).toEqual(["first", "continuation"]);
    const shape = model.cv.headerShapes![0];
    expect(shape.fill?.radialFade).toEqual({ innerPct: 0, outerPct: 100 });
    validateDecoration(shape);
    for (const radialFade of [
      { innerPct: -1, outerPct: 100 },
      { innerPct: 50, outerPct: 50 },
      { innerPct: 0, outerPct: 101 },
      { innerPct: NaN, outerPct: 100 },
    ])
      expect(() => validateDecoration({ ...shape, fill: { ...shape.fill!, radialFade } })).toThrow(
        "radial fade",
      );
    expect(() =>
      validateDecoration({ ...shape, fill: { ...shape.fill!, endColor: "FFFFFF" } }),
    ).toThrow("radial fade");
    expect(
      buildDossierDocModel(glowFixture("custom-colors")).cv.headerShapes?.find(
        (s) => s.fill?.radialFade,
      )?.fill?.color,
    ).toBe("D48B35");
    const dormant = glowFixture("none");
    dormant.settings.chrome!.shared.headerBackgroundColor = "#123456";
    expect(buildDossierDocModel(dormant).cv.headerShapes).toHaveLength(2);
    dormant.cv.design.bgOpacity = -1;
    expect(() => buildDossierDocModel(dormant)).toThrow("opacity");
    const hidden = glowFixture("none");
    hidden.cv.design.bgOpacity = 0;
    expect(buildDossierDocModel(hidden).cv.headerShapes).toBeUndefined();
  });
  test("explicit header surfaces replace default paint and retain native user colors", () => {
    const input = glowFixture("continuation");
    Object.assign(input.settings.chrome!.shared, {
      headerBackgroundColor: "#123456",
      headerGradientColor: "#abcdef",
      headerTextColor: "#fedcba",
    });
    const model = buildDossierDocModel(input);
    expect(model.letter.headerShapes).toBeUndefined();
    expect(
      model.letter
        .firstHeader!.flatMap((p) => p.runs)
        .find((r) => r.fieldId === "letter.sender.name")?.style.color,
    ).toBe("FEDCBA");
    expect(model.letter.artwork.find((a) => a.id === "letter.artwork.header")?.fill).toEqual({
      color: "123456",
      endColor: "ABCDEF",
    });
  });
  test("native photo crop and unsupported sidebar stay explicit", async () => {
    const model = buildDossierDocModel(glowFixture("images", "data:image/png;base64,test"));
    expect(model.cover.blocks.find((b) => b.id === "cover.photo")).toMatchObject({
      kind: "image",
      align: "right",
    });
    expect(
      buildDossierDocModel(glowFixture("sidebar")).cv.blocks.some(
        (block) => block.kind === "parallel-flow",
      ),
    ).toBe(true);
  });
});
