import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { WELLE_FIXTURES, welleFixture } from "../fixtures/docx-next/welle";
import { dossierDefaultFontKey } from "../../src/lib/dossier-theme";
import { WORD_FONTS } from "../../src/lib/docx-next/fonts";
describe("Horizont split hero and native horizon contact surface", () => {
  test("all stress models stay deterministic with validated nonsemantic paint", () => {
    for (const kind of WELLE_FIXTURES) {
      const input = welleFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model.theme.font).toBe(WORD_FONTS[dossierDefaultFontKey("welle")].font);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [model.cover, model.letter, model.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("source field/rule are consumed as a growing native row with a top border", () => {
    const m = buildDossierDocModel(welleFixture("custom-colors"));
    const row = m.cover.blocks.find((b) => b.id === "cover.composition.row:2");
    expect(row).toMatchObject({
      kind: "table",
      decoration: {
        fillColor: "385D58",
        borderColor: "D48B35",
        borderWidthMm: 0.6,
        borderSides: ["top"],
        paddingXMm: 3,
      },
    });
    expect(m.cover.headerShapes!.map((s) => s.id)).toEqual(["cover.decor-accent-line"]);
    expect(m.letter.headerShapes!.some((s) => s.shape === "path" && s.yMm === 279)).toBe(true);
    expect(m.cv.headerShapes!.some((s) => s.yMm === 273 && s.heightMm === 24)).toBe(true);
  });
  test("native split photo and independent footer contrast respect hidden motifs and saved colors", () => {
    const m = buildDossierDocModel(welleFixture("images", "data:image/png;base64/test"));
    expect(walkBlocks(m.cover.blocks).find((b) => b.id === "cover.photo")).toMatchObject({
      widthMm: 48,
      align: "right",
      frame: { heightRatio: 1.25 },
    });
    expect(m.cv.footer[0].runs[0].style.color).toBe("FFFFFF");
    const off = buildDossierDocModel(welleFixture("no-motifs"));
    expect(off.cv.headerShapes).toBeUndefined();
    expect(off.cv.footer[0].runs[0].style.color).toBe("1B232C");
    const faded = welleFixture();
    faded.cv.design.bgOpacity = 0.1;
    expect(buildDossierDocModel(faded).cv.footer[0].runs[0].style.color).not.toBe("FFFFFF");
    const input = welleFixture("continuation");
    input.settings.chrome!.shared.footerTextColor = "#123456";
    expect(buildDossierDocModel(input).cv.footer[0].runs[0].style.color).toBe("123456");
  });
  test("unsupported border gradients/thickness and sidebar requests use shared flow", async () => {
    const input = welleFixture(),
      border = input.cover.blocks.find((b) => b.id === "decor-horizon-rule")!;
    border.style.gradTo = "secondary";
    expect(() => buildDossierDocModel(input)).toThrow("solid representable lines");
    border.style.gradTo = undefined;
    border.style.strokeWidth = 20;
    expect(() => buildDossierDocModel(input)).toThrow("solid representable lines");
    expect(
      buildDossierDocModel(welleFixture("sidebar")).cv.blocks.some(
        (block) => block.kind === "parallel-flow",
      ),
    ).toBe(true);
  });
});
