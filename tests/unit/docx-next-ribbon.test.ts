import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { RIBBON_FIXTURES, ribbonFixture } from "../fixtures/docx-next/ribbon";
describe("Ribbon shared native hero and scoped paint", () => {
  test("scenarios preserve deterministic portable models with native field identity", () => {
    for (const kind of RIBBON_FIXTURES) {
      const input = ribbonFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
    }
  });
  test("the growing hero has editable photo/text and a gutter, never baked-in text", () => {
    const input = ribbonFixture("images", "data:image/png;base64/test");
    input.settings.fieldStyles = { "cover.fullName": { color: "123456", italic: true } };
    const model = buildDossierDocModel(input);
    const row = model.cover.blocks.find((b) => b.id === "cover.composition.row:1");
    expect(row).toMatchObject({
      kind: "table",
      widths: [0.34, 0.05, 0.61],
      decoration: { fillColor: "D5A13D" },
    });
    if (row?.kind !== "table") throw new Error("Missing native hero");
    expect(row.rows[0].cells[0][0]).toMatchObject({
      kind: "image",
      id: "cover.photo",
      align: "left",
    });
    expect(row.rows[0].cells[1]).toEqual([]);
    const name = walkBlocks(row.rows[0].cells[2]).find(
      (b) => b.id === "cover.fullName",
    ) as Paragraph;
    expect(name.runs[0].style).toMatchObject({ color: "123456", italic: true });
    expect(model.cover.headerShapes?.every((s) => s.semanticText === false)).toBe(true);
    expect(model.cover.headerShapes?.[0].cornerRadiiMm).toEqual([0, 0, 28, 0]);
  });
  test("semantic palette defaults keep contact text readable and preserve both override sources", () => {
    const base = ribbonFixture();
    const normal = buildDossierDocModel(base);
    const contact = (model: typeof normal) =>
      walkBlocks(model.cover.blocks).find((b) => b.id === "cover.kontakt") as Paragraph;
    expect(contact(normal).runs.every((r) => r.style.color === "253A34")).toBe(true);
    expect(base.cover.blocks.find((b) => b.id === "kontakt")?.style.color).not.toBe("ink");
    const authored = ribbonFixture();
    const block = authored.cover.blocks.find((b) => b.id === "kontakt")!;
    block.style.color = "#123456";
    block.style.opacity = 1;
    Object.assign(block, { userStyleKeys: ["color"] });
    expect(
      contact(buildDossierDocModel(authored)).runs.every((r) => r.style.color === "123456"),
    ).toBe(true);
    authored.settings.fieldStyles = { "cover.kontakt": { color: "ABCDEF" } };
    expect(
      contact(buildDossierDocModel(authored)).runs.every((r) => r.style.color === "ABCDEF"),
    ).toBe(true);
  });
  test("disabled header uses quiet ribbons on both stories; CV opacity and palette are independent", () => {
    const model = buildDossierDocModel(ribbonFixture("none"));
    for (const part of [model.letter, model.cv]) {
      expect(part.headerShapes?.map((s) => s.repeat)).toEqual([
        "first",
        "first",
        "first",
        "continuation",
        "continuation",
        "continuation",
      ]);
      expect(part.headerShapes?.[2]).toMatchObject({ yMm: 294, heightMm: 3 });
    }
    const hidden = ribbonFixture("none");
    hidden.cv.design.bgOpacity = 0;
    expect(buildDossierDocModel(hidden).cv.headerShapes).toBeUndefined();
    const colors = buildDossierDocModel(ribbonFixture("custom-colors"));
    expect(colors.cover.headerShapes?.[0].fill?.color).toBe("385D58");
    expect(colors.cover.headerShapes?.[1].fill?.color).toBe("D48B35");
  });
  test("custom header surfaces retain precedence; native CV and rich letter content remain shared", () => {
    const input = ribbonFixture("continuation");
    input.settings.chrome!.shared.headerBackgroundColor = "#385D58";
    const model = buildDossierDocModel(input);
    expect(model.letter.headerShapes).toBeUndefined();
    expect(model.letter.artwork.some((a) => a.id === "letter.artwork.header")).toBe(true);
    const custom = buildDossierDocModel(ribbonFixture("custom"));
    expect(walkBlocks(custom.letter.blocks).some((b) => b.kind === "table")).toBe(true);
    expect(walkBlocks(custom.cv.blocks).some((b) => b.kind === "entry")).toBe(true);
  });
  test("sidebar remains explicitly blocked and the single renderer has no candidate-ID branches", async () => {
    await expect(
      renderDossierDocx(buildDossierDocModel(ribbonFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
    for (const file of [
      "renderer.ts",
      "build-model.ts",
      "decoration.ts",
      "template-composition.ts",
      "cover-composition.ts",
      "template-motifs.ts",
    ])
      expect(readFileSync(`src/lib/docx-next/${file}`, "utf8")).not.toMatch(
        /(?:monoLuxe|ledger|ribbon)["']/,
      );
  });
});
