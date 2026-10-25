import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { VERLAUF_3_FIXTURES, verlauf3Fixture } from "../fixtures/docx-next/verlauf3";
describe("Verlauf 3 reuse of semantic palettes and multi-stop composition", () => {
  test("all stress snapshots produce deterministic native models and valid geometry", () => {
    for (const kind of VERLAUF_3_FIXTURES) {
      const input = verlauf3Fixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [model.cover, model.letter, model.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("warm three-color stops, independent white blooms and light-paper native ink match roles", () => {
    const model = buildDossierDocModel(verlauf3Fixture());
    expect(model.cover.headerShapes?.[0].fill).toMatchObject({
      angleDeg: 162,
      stops: [
        { color: "7B315D", offsetPct: 0 },
        { color: "E77B52", offsetPct: 72 },
        { color: "F4BB8A", offsetPct: 125 },
      ],
    });
    expect(model.cover.headerShapes?.[1]).toMatchObject({
      xMm: -28,
      yMm: -30,
      widthMm: 118,
      opacity: 0.13,
      fill: { color: "FFFFFF" },
    });
    expect(model.cover.headerShapes?.[2]).toMatchObject({
      xMm: 126,
      yMm: 184,
      widthMm: 128,
      opacity: 0.16,
    });
    expect(
      (walkBlocks(model.cover.blocks).find((b) => b.id === "cover.fullName") as Paragraph).runs[0]
        .style.color,
    ).toBe("FFFFFF");
    expect(
      (walkBlocks(model.letter.blocks).find((b) => b.id === "letter.subject") as Paragraph).runs[0]
        .style.color,
    ).toBe("111111");
    expect(model.letter.footer[0].runs[0].style.color).toBe("111111");
    expect(model.cv.header.flatMap((p) => p.runs).every((r) => r.style.color !== "FFFFFF")).toBe(
      true,
    );
  });
  test("custom slots and editable colors remain independent of native first/continuation paint", () => {
    const input = verlauf3Fixture("custom-colors");
    input.settings.fieldStyles = { "cover.fullName": { color: "123456", font: "Georgia" } };
    const model = buildDossierDocModel(input);
    expect(model.cover.headerShapes?.[0].fill?.stops?.map((s) => s.color)).toEqual([
      "385D58",
      "D48B35",
      "6B948C",
    ]);
    expect(
      (walkBlocks(model.cover.blocks).find((b) => b.id === "cover.fullName") as Paragraph).runs[0]
        .style,
    ).toMatchObject({ color: "123456", font: "Georgia" });
    for (const kind of ["normal", "compact", "none", "continuation"] as const) {
      const part = buildDossierDocModel(verlauf3Fixture(kind)).letter;
      expect(part.headerShapes).toHaveLength(4);
      expect(new Set(part.headerShapes!.map((s) => s.id)).size).toBe(4);
      expect(part.headerShapes?.[1]).toMatchObject({ xMm: 176, widthMm: 34, heightMm: 16 });
    }
    expect(buildDossierDocModel(verlauf3Fixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("native photos, rich content and explicit sidebar rejection use the same renderer", async () => {
    expect(
      walkBlocks(
        buildDossierDocModel(verlauf3Fixture("images", "data:image/png;base64/test")).cover.blocks,
      ).some((b) => b.kind === "image"),
    ).toBe(true);
    expect(
      walkBlocks(buildDossierDocModel(verlauf3Fixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
    expect(
      buildDossierDocModel(verlauf3Fixture("sidebar")).cv.blocks.some(
        (block) => block.kind === "parallel-flow",
      ),
    ).toBe(true);
  });
});
