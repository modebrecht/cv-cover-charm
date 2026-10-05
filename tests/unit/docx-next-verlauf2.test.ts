import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import {
  validateDecoration,
  decorationAssetKey,
  type DecorationPaint,
} from "../../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { VERLAUF_2_FIXTURES, verlauf2Fixture } from "../fixtures/docx-next/verlauf2";
import { withUserStyleKeys } from "../../src/components/cover/user-style-precedence";
const text = (blocks: Parameters<typeof walkBlocks>[0], id: string) =>
  walkBlocks(blocks).find((b) => b.id === id) as Paragraph;
describe("Verlauf 2 declarative multi-stop paint and semantic interior palettes", () => {
  test("literal inline colors and saved element colors override default palette roles", () => {
    const input = verlauf2Fixture();
    input.cover.blocks = input.cover.blocks.map((block) =>
      block.id === "beruf"
        ? withUserStyleKeys(
            {
              ...block,
              style: { ...block.style, color: "#ABCDEF", opacity: 1 },
              lines: [[{ t: "Literal", color: "#123456" }], [{ t: "Palette", color: "primary" }]],
            },
            { color: "#ABCDEF" },
          )
        : block,
    );
    const runs = text(buildDossierDocModel(input).cover.blocks, "cover.profession").runs;
    expect(runs.map((run) => run.style.color)).toEqual(["123456", "ABCDEF"]);
  });
  test("every portable fixture retains deterministic semantic models and valid paint", () => {
    for (const kind of VERLAUF_2_FIXTURES) {
      const input = verlauf2Fixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [model.cover, model.letter, model.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("cover slots resolve all three stops, while fixed white blooms ignore palette edits", () => {
    const model = buildDossierDocModel(verlauf2Fixture("custom-colors"));
    expect(model.cover.headerShapes?.[0].fill).toMatchObject({
      angleDeg: 148,
      stops: [
        { color: "385D58", offsetPct: 2 },
        { color: "D48B35", offsetPct: 68 },
        { color: "6B948C", offsetPct: 118 },
      ],
    });
    expect(model.cover.headerShapes?.[1].fill?.color).toBe("FFFFFF");
    expect(text(model.cover.blocks, "cover.fullName").runs[0].style.color).toBe("FFFFFF");
    expect(
      text(model.cover.blocks, "cover.profession").runs.every((r) => r.style.color === "FEFEFF"),
    ).toBe(true);
    expect(text(model.letter.blocks, "letter.subject").runs[0].style.color).toBe("111111");
    expect(model.cv.header.flatMap((p) => p.runs).every((r) => r.style.color !== "FFFFFF")).toBe(
      true,
    );
    expect(model.letter.footer[0].runs[0].style.color).toBe("111111");
  });
  test("explicit paper, text and canonical field overrides retain precedence", () => {
    const input = verlauf2Fixture();
    input.letter.design.paperColor = "#172033";
    input.letter.design.textColor = "#abcdef";
    input.cv.design.paperColor = "#172033";
    input.settings.fieldStyles = {
      "cover.fullName": { color: "123456" },
      "letter.subject": { color: "654321" },
    };
    const model = buildDossierDocModel(input);
    expect(text(model.cover.blocks, "cover.fullName").runs[0].style.color).toBe("123456");
    expect(text(model.letter.blocks, "letter.subject").runs[0].style.color).toBe("654321");
    expect(model.letter.footer[0].runs[0].style.color).toBe("ABCDEF");
    expect(model.cv.artwork[0].fill.color).toBe("172033");
    expect(model.cv.header.flatMap((p) => p.runs).every((r) => r.style.color !== "1A1A1E")).toBe(
      true,
    );
  });
  test("strict stop validation rejects ambiguity, invalid ranges and ordering; assets include every stop", () => {
    const shape = buildDossierDocModel(verlauf2Fixture()).cover.headerShapes![0];
    for (const stops of [
      [],
      [{ color: "FFFFFF", offsetPct: 0 }],
      [
        { color: "bad", offsetPct: 0 },
        { color: "000000", offsetPct: 100 },
      ],
      [
        { color: "FFFFFF", offsetPct: 100 },
        { color: "000000", offsetPct: 0 },
      ],
      [
        { color: "FFFFFF", offsetPct: 0 },
        { color: "000000", offsetPct: 201 },
      ],
    ]) {
      expect(() => validateDecoration({ ...shape, fill: { ...shape.fill!, stops } })).toThrow(
        "gradient stops",
      );
    }
    expect(() =>
      validateDecoration({ ...shape, fill: { ...shape.fill!, endColor: "FFFFFF" } }),
    ).toThrow("gradient stops");
    const changed: DecorationPaint = {
      ...shape,
      fill: {
        ...shape.fill!,
        stops: shape.fill!.stops!.map((s, i) => (i === 1 ? { ...s, color: "123456" } : s)),
      },
    };
    expect(decorationAssetKey(shape)).not.toBe(decorationAssetKey(changed));
  });
  test("native images/rich content and independent header visibility survive; sidebar fails explicitly", async () => {
    expect(
      walkBlocks(
        buildDossierDocModel(verlauf2Fixture("images", "data:image/png;base64/test")).cover.blocks,
      ).some((b) => b.kind === "image"),
    ).toBe(true);
    expect(
      walkBlocks(buildDossierDocModel(verlauf2Fixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
    expect(buildDossierDocModel(verlauf2Fixture("none")).letter.headerShapes).toHaveLength(4);
    expect(buildDossierDocModel(verlauf2Fixture("no-motifs")).cv.headerShapes).toBeUndefined();
    await expect(
      renderDossierDocx(buildDossierDocModel(verlauf2Fixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
  });
});
