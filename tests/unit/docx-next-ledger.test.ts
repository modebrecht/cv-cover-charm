import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { LEDGER_FIXTURES, ledgerFixture } from "../fixtures/docx-next/ledger";
describe("Ledger native cover columns and quiet index paint", () => {
  test("all cases preserve portable identities and deterministic models", () => {
    for (const kind of LEDGER_FIXTURES) {
      const input = ledgerFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
    }
  });
  test("left photo and native hero group share one declarative cover row", () => {
    const model = buildDossierDocModel(ledgerFixture("images", "data:image/png;base64/test"));
    const row = model.cover.blocks.find((b) => b.id === "cover.composition.row:1");
    expect(row).toMatchObject({ kind: "table", widths: [0.34, 0.05, 0.61] });
    if (row?.kind !== "table") throw new Error("Missing native cover row");
    expect(row.rows[0].cells[0][0]).toMatchObject({
      kind: "image",
      id: "cover.photo",
      align: "left",
    });
    expect(walkBlocks(row.rows[0].cells[2]).some((b) => b.id === "cover.fullName")).toBe(true);
    const input = ledgerFixture("custom");
    input.settings.fieldStyles = { "cover.fullName": { italic: true, color: "ABCDEF" } };
    const name = walkBlocks(buildDossierDocModel(input).cover.blocks).find(
      (b) => b.id === "cover.fullName",
    ) as Paragraph;
    expect(name.runs[0].style).toMatchObject({ italic: true, color: "ABCDEF" });
  });
  test("quiet rails repeat independently of running text and retain palette/background control", () => {
    const model = buildDossierDocModel(ledgerFixture("none"));
    for (const part of [model.cv, model.letter]) {
      expect(part.headerShapes?.map((s) => s.repeat)).toEqual([
        "first",
        "first",
        "first",
        "continuation",
        "continuation",
        "continuation",
      ]);
      expect(part.headerShapes?.[0]).toMatchObject({
        xMm: 12,
        widthMm: 9,
        heightMm: 297,
        opacity: 0.42,
        semanticText: false,
      });
      expect(part.artwork.some((a) => a.id.includes(".band."))).toBe(false);
    }
    const hidden = buildDossierDocModel(ledgerFixture("no-motifs"));
    expect(hidden.cv.headerShapes).toBeUndefined();
    expect(hidden.letter.headerShapes).toHaveLength(6);
    const colors = buildDossierDocModel(ledgerFixture("custom-colors"));
    expect(colors.cv.headerShapes?.[0].fill?.color).toBe("D48B35");
    expect(colors.cover.headerShapes?.[0].fill?.color).toBe("385D58");
  });
  test("CV sidebar remains unsupported; date rows and rich content use the single renderer", async () => {
    expect(
      buildDossierDocModel(ledgerFixture("sidebar")).cv.blocks.some(
        (block) => block.kind === "parallel-flow",
      ),
    ).toBe(true);
    const model = buildDossierDocModel(ledgerFixture("timeline"));
    expect(walkBlocks(model.cv.blocks).some((b) => b.kind === "entry")).toBe(true);
    expect(
      walkBlocks(buildDossierDocModel(ledgerFixture("custom")).letter.blocks).some(
        (b) => b.kind === "table",
      ),
    ).toBe(true);
    for (const file of [
      "renderer.ts",
      "build-model.ts",
      "template-composition.ts",
      "cover-composition.ts",
      "template-motifs.ts",
    ])
      expect(readFileSync(`src/lib/docx-next/${file}`, "utf8")).not.toContain('"ledger"');
  });
});
