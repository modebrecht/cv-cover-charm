import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { SONNE_FIXTURES, sonneFixture } from "../fixtures/docx-next/sonne";
describe("Sonne growing native hero and image zone", () => {
  test("portable stress models preserve deterministic semantic content and valid paint", () => {
    for (const kind of SONNE_FIXTURES) {
      const input = sonneFixture(kind),
        m = buildDossierDocModel(input);
      expect(m.issues).toEqual([]);
      expect(m).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      for (const part of [m.cover, m.letter, m.cv])
        for (const shape of part.headerShapes ?? []) validateDecoration(shape);
    }
  });
  test("authored yellow rectangle becomes a growing native row while the dark photo zone replaces fixed halo paint", () => {
    const m = buildDossierDocModel(sonneFixture("custom-colors")),
      blocks = walkBlocks(m.cover.blocks);
    expect(blocks.find((b) => b.id === "cover.composition.row:0")).toMatchObject({
      kind: "table",
      decoration: { fillColor: "385D58", paddingXMm: 3 },
    });
    expect(
      m.cover.headerShapes?.some((s) =>
        ["cover.decor-top-field", "cover.decor-photo-circle"].includes(s.id),
      ) ?? false,
    ).toBe(false);
    const long = walkBlocks(buildDossierDocModel(sonneFixture("hero-long")).cover.blocks).find(
      (b) => b.id === "cover.fullName",
    ) as Paragraph;
    expect(long.runs.map((r) => r.text).join("")).toContain("Herozeile 40: Lea");
    expect(buildDossierDocModel(sonneFixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("native lower fields have explicit light palette defaults and literal saved overrides win", () => {
    const input = sonneFixture();
    input.cover.blocks.find((b) => b.id === "kontakt")!.style.opacity = 1;
    input.settings.fieldStyles = { "cover.kontakt": { color: "123456", font: "Georgia" } };
    const blocks = walkBlocks(buildDossierDocModel(input).cover.blocks);
    expect((blocks.find((b) => b.id === "cover.kontakt") as Paragraph).runs[0].style).toMatchObject(
      { color: "123456", font: "Georgia" },
    );
    const base = walkBlocks(buildDossierDocModel(sonneFixture()).cover.blocks);
    expect((base.find((b) => b.id === "cover.beilagen") as Paragraph).runs[0].style.color).not.toBe(
      "141414",
    );
  });
  test("circular editable pictures survive and unsupported authored surfaces/Sidebar fail explicitly", async () => {
    const input = sonneFixture("images", "data:image/png;base64/test");
    expect(
      walkBlocks(buildDossierDocModel(input).cover.blocks).find((b) => b.id === "cover.photo"),
    ).toMatchObject({ kind: "image", widthMm: 78, frame: { heightRatio: 1, radiusMm: 999 } });
    input.cover.blocks.find((b) => b.id === "decor-top-field")!.style.gradFrom = "primary";
    expect(() => buildDossierDocModel(input)).toThrow(
      "native cover surfaces require solid unbordered rectangles",
    );
    await expect(
      renderDossierDocx(buildDossierDocModel(sonneFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
  });
});
