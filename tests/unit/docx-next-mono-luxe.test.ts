import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { MONO_LUXE_FIXTURES, monoLuxeFixture } from "../fixtures/docx-next/mono-luxe";
import { composeHeaderBands } from "../../src/lib/docx-next/template-composition";
import { briefFixture } from "../fixtures/docx-next/brief";
import { readFileSync } from "node:fs";

describe("motif-only running chrome and Mono Luxe candidate", () => {
  test("surface is generic and leaves the same native header geometry with or without a band", () => {
    const base = buildDossierDocModel(briefFixture()).letter;
    const policy = {
      fillSlot: "primary",
      accentSlot: "secondary",
      compactFirstMm: 14,
      compactContinuationMm: 14,
    };
    const band = structuredClone(base),
      motifs = structuredClone(base);
    for (const [part, surface] of [
      [band, "band"],
      [motifs, "motifs"],
    ] as const)
      composeHeaderBands(
        part,
        { ...policy, surface },
        { primary: "171717" },
        "8E6F42",
        "contact",
        "compact",
        36,
        false,
      );
    expect(band.artwork.filter((a) => a.id.includes(".band."))).toHaveLength(2);
    expect(motifs.artwork.filter((a) => a.id.includes(".band."))).toHaveLength(0);
    expect(motifs.page).toEqual(band.page);
    expect(motifs.header).toEqual(band.header);
  });
  test("all fixtures are portable, deterministic and retain explicit identities", () => {
    for (const kind of MONO_LUXE_FIXTURES) {
      const input = monoLuxeFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
    }
  });
  test("cap/rule repeat without a second masthead, and editable contact ink is readable on paper", () => {
    const model = buildDossierDocModel(monoLuxeFixture());
    for (const part of [model.letter, model.cv]) {
      expect(part.artwork.some((a) => a.id.includes(".band."))).toBe(false);
      expect(part.headerShapes?.map((s) => s.heightMm)).toEqual([3, 0.45, 3, 0.45]);
      expect(part.header.flatMap((p) => p.runs).every((r) => r.style.color === "171717")).toBe(
        true,
      );
    }
    const hidden = monoLuxeFixture("none");
    hidden.cv.design.bgOpacity = 0;
    expect(buildDossierDocModel(hidden).cv.headerShapes).toBeUndefined();
    const colors = buildDossierDocModel(monoLuxeFixture("custom-colors"));
    expect(colors.cover.headerShapes?.[0].fill?.color).toBe("385D58");
    expect(colors.letter.headerShapes?.[1].fill?.color).toBe("D48B35");
  });
  test("authored custom surfaces and field styles override motif-only defaults", () => {
    const input = monoLuxeFixture("continuation");
    input.settings.chrome!.shared.headerBackgroundColor = "#171717";
    input.settings.fieldStyles = { "letter.sender.name": { color: "ABCDEF", italic: true } };
    const model = buildDossierDocModel(input);
    expect(model.letter.headerShapes).toBeUndefined();
    expect(model.letter.artwork.some((a) => a.id === "letter.artwork.header")).toBe(true);
    expect(
      [...model.cv.header, ...(model.cv.firstHeader ?? [])]
        .flatMap((p) => p.runs)
        .some((r) => r.style.color === "FFFFFF"),
    ).toBe(true);
    const name = walkBlocks([
      ...model.letter.blocks,
      ...model.letter.header,
      ...(model.letter.firstHeader ?? []),
    ]).find(
      (b) => b.kind === "paragraph" && b.runs.some((r) => r.fieldId === "letter.sender.name"),
    ) as Paragraph;
    expect(name.runs.find((r) => r.fieldId === "letter.sender.name")?.style).toMatchObject({
      color: "ABCDEF",
      italic: true,
    });
  });
  test("editable pictures/rich tables remain native and sidebar requests block explicitly", async () => {
    const image = buildDossierDocModel(monoLuxeFixture("images", "data:image/png;base64/test"));
    expect(walkBlocks(image.cover.blocks).some((b) => b.kind === "image")).toBe(true);
    const custom = buildDossierDocModel(monoLuxeFixture("custom"));
    expect(walkBlocks(custom.letter.blocks).some((b) => b.kind === "table")).toBe(true);
    await expect(
      renderDossierDocx(buildDossierDocModel(monoLuxeFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
    for (const file of [
      "renderer.ts",
      "build-model.ts",
      "template-composition.ts",
      "cover-composition.ts",
      "template-motifs.ts",
    ])
      expect(readFileSync(`src/lib/docx-next/${file}`, "utf8")).not.toContain('"monoLuxe"');
  });
});
