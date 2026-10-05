import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { FOREST_FLOW_FIXTURES, forestFlowFixture } from "../fixtures/docx-next/forest-flow";
describe("Forest Flow native cover columns and independent interior gutters", () => {
  test("portable stress scenarios preserve deterministic native models", () => {
    for (const kind of FOREST_FLOW_FIXTURES) {
      const input = forestFlowFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
    }
  });
  test("the cover rail contains semantic fields in native cells with a separate gutter and main column", () => {
    const input = forestFlowFixture("images", "data:image/png;base64/test");
    input.settings.margins = { letter: { left: 42 }, cv: { left: 45 } };
    const model = buildDossierDocModel(input);
    expect(model.cover.page.margins).toEqual({ top: 18, right: 14, bottom: 20, left: 7 });
    expect(model.letter.page.margins.left).toBe(42);
    expect(model.cv.page.margins.left).toBe(45);
    const row = model.cover.blocks[0];
    expect(row).toMatchObject({ kind: "table", widths: [0.2, 0.15, 0.65] });
    if (row.kind !== "table") throw new Error("Missing native rail");
    expect(row.rows[0].cells[1]).toEqual([]);
    expect(
      walkBlocks(row.rows[0].cells[0])
        .filter((b) => b.kind === "paragraph")
        .map((b) => b.id),
    ).toContain("cover.kontakt");
    const title = walkBlocks(row.rows[0].cells[0]).find(
      (b) => b.id === "cover.kontaktTitel",
    ) as Paragraph;
    expect(title.beforeMm).toBe(120);
    expect(title.runs[0].style.color).toBe("F5F8F4");
    expect(
      walkBlocks(row.rows[0].cells[2]).some((b) => b.kind === "image" && b.id === "cover.photo"),
    ).toBe(true);
    const name = walkBlocks(row.rows[0].cells[2]).find(
      (b) => b.id === "cover.fullName",
    ) as Paragraph;
    expect(name.beforeMm).toBe(40);
  });
  test("native canonical styles retain precedence over palette defaults", () => {
    const input = forestFlowFixture();
    input.settings.fieldStyles = { "cover.kontaktTitel": { color: "123456", italic: true } };
    const p = walkBlocks(buildDossierDocModel(input).cover.blocks).find(
      (b) => b.id === "cover.kontaktTitel",
    ) as Paragraph;
    expect(p.runs[0].style).toMatchObject({ color: "123456", italic: true });
    expect(p.runs[0].style.font).toBe("Arial");
    const source = input.cover.blocks.find((b) => b.id === "kontaktTitel")!;
    source.style.font = "serif";
    Object.assign(source, { userStyleKeys: ["font"] });
    const authored = walkBlocks(buildDossierDocModel(input).cover.blocks).find(
      (b) => b.id === "cover.kontaktTitel",
    ) as Paragraph;
    expect(authored.runs[0].style.font).toBe("Georgia");
    input.settings.fieldStyles["cover.kontaktTitel"] = { font: "Verdana" };
    const canonical = walkBlocks(buildDossierDocModel(input).cover.blocks).find(
      (b) => b.id === "cover.kontaktTitel",
    ) as Paragraph;
    expect(canonical.runs[0].style.font).toBe("Verdana");
  });
  test("quiet page paint repeats independently of native contact chrome and respects CV visibility", () => {
    for (const kind of ["normal", "none", "continuation"] as const) {
      const model = buildDossierDocModel(forestFlowFixture(kind));
      for (const part of [model.letter, model.cv]) {
        expect(part.artwork.some((a) => a.id.includes(".band."))).toBe(false);
        expect(part.headerShapes).toHaveLength(6);
        expect(new Set(part.headerShapes!.map((s) => s.id)).size).toBe(6);
        expect(part.headerShapes?.[0]).toMatchObject({
          widthMm: 10,
          heightMm: 297,
          repeat: "first",
        });
        expect(part.headerShapes?.[3].repeat).toBe("continuation");
      }
    }
    expect(buildDossierDocModel(forestFlowFixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("a decorative rail never masquerades as an accepted CV sidebar", async () => {
    expect(
      buildDossierDocModel(forestFlowFixture("sidebar")).cv.blocks.some(
        (block) => block.kind === "parallel-flow",
      ),
    ).toBe(true);
  });
});
