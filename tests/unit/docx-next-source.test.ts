import { compositeTextColor } from "../../src/lib/docx-next/colors";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import type { Paragraph } from "../../src/lib/docx-next/model";
import { describe, expect, test } from "bun:test";
import { toDossierSource } from "../../src/lib/docx-next/source-adapter";
import { bindSavedTypography } from "../../src/lib/docx-next/typography-bindings";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import type { PortableDossierFieldTypographyState } from "../../src/lib/dossier-field-typography";
import { briefFixture } from "../fixtures/docx-next/brief";

const old = (style = { italic: true }) => ({
  section: "Schule",
  label: "Titel",
  value: "Same",
  style,
});
const state = (
  cv: PortableDossierFieldTypographyState["cv"],
): PortableDossierFieldTypographyState => ({ version: 1, cv, letter: {} });

describe("DOCX Next source boundary and saved identity binding", () => {
  test("historical PDF adapter copies authored data and excludes print/measurement state", () => {
    const input = briefFixture();
    Object.assign(input.cover, { pages: [{ rectangle: [1, 2, 3, 4] }] });
    Object.assign(input.letter, { pagination: { pageBreaks: [6] } });
    Object.assign(input.cv, { coverFingerprint: "preview only", measuredRows: [4] });
    const neutral = toDossierSource(input.cover, input.letter, input.cv);
    expect(Object.keys(neutral.cover).sort()).toEqual([
      "blocks",
      "colors",
      "customFieldIds",
      "data",
      "fontScale",
      "template",
    ]);
    expect(Object.keys(neutral.letter).sort()).toEqual(["data", "design"]);
    expect(Object.keys(neutral.cv).sort()).toEqual(["data", "design", "elementStyles", "elements"]);
    expect(buildDossierDocModel({ ...neutral, settings: input.settings })).toEqual(
      buildDossierDocModel(input),
    );
    neutral.cv.data.person.vorname = "Editable copy";
    expect(input.cv.data.person.vorname).not.toBe("Editable copy");
  });
  test("anonymous records require explicit stable-key bindings even with unique matching text", () => {
    const saved = state({ "old-hash": old() });
    expect(bindSavedTypography(saved)).toEqual({
      fieldStyles: {},
      unresolvedTypography: ["old-hash"],
    });
    expect(bindSavedTypography(saved, { "old-hash": "cv.entry.schule:one.title" })).toEqual({
      fieldStyles: { "cv.entry.schule:one.title": { italic: true } },
      unresolvedTypography: [],
    });
    saved.cv["old-hash"].value = "Renamed";
    expect(
      bindSavedTypography(saved, { "old-hash": "cv.entry.schule:one.title" }).unresolvedTypography,
    ).toEqual([]);
  });
  test("anonymous random field IDs bind by their saved ID; wrong scope remains blocking", () => {
    const saved = state({ bucket: { ...old(), fieldId: "cv-random-id" } });
    expect(bindSavedTypography(saved, { "cv-random-id": "cv.person.email" }).fieldStyles).toEqual({
      "cv.person.email": { italic: true },
    });
    expect(
      bindSavedTypography(saved, { "cv-random-id": "letter.subject" }).unresolvedTypography,
    ).toEqual(["cv-random-id"]);
  });
  test("canonical identities cannot be redirected and conflicts cannot overwrite saved styles", () => {
    const saved = state({ canonical: { ...old(), fieldId: "cv.person.email" } });
    expect(
      bindSavedTypography(saved, { "cv.person.email": "cv.person.phone" }).fieldStyles,
    ).toEqual({ "cv.person.email": { italic: true } });
    saved.cv.second = old({ italic: false });
    expect(() => bindSavedTypography(saved, { second: "cv.person.email" })).toThrow(
      "conflicting typography bindings",
    );
  });
  test("compatible duplicate bindings preserve independent properties deterministically", () => {
    const saved = state({ a: old(), b: { ...old(), style: { underline: true } } });
    const bindings = { a: "cv.person.email", b: "cv.person.email" };
    expect(bindSavedTypography(saved, bindings).fieldStyles).toEqual({
      "cv.person.email": { italic: true, underline: true },
    });
    expect(bindSavedTypography(JSON.parse(JSON.stringify(saved)), bindings)).toEqual(
      bindSavedTypography(saved, bindings),
    );
  });
});

describe("authored semantic opacity", () => {
  test("native ink composites against the declared paper/cell color without raster text", () => {
    expect(compositeTextColor("000000", "FFFFFF", 0.5)).toBe("808080");
    expect(compositeTextColor("123456", "FFFFFF", 0.85)).toBe("36526F");
    expect(compositeTextColor("123456", "ABCDEF", 0)).toBe("ABCDEF");
    for (const opacity of [NaN, -0.1, 1.1])
      expect(() => compositeTextColor("000000", "FFFFFF", opacity)).toThrow(
        "invalid element opacity",
      );
    const input = briefFixture();
    input.cover.colors.bg = "#F0F0F0";
    const name = input.cover.blocks.find((b) => b.id === "name")!;
    name.style.color = "#000000";
    name.style.opacity = 0.5;
    const paragraph = buildDossierDocModel(input).cover.blocks.find(
      (b) => b.id === "cover.fullName",
    ) as Paragraph;
    expect(paragraph.runs[0].style.color).toBe("787878");
    expect(paragraph.runs[0].text).toBe("Lea Müller");
  });
  test("translucent semantic images block explicitly until native alpha is accepted", async () => {
    const input = briefFixture();
    input.cover.data.foto = "test-pixels";
    input.cover.blocks.find((b) => b.kind === "photo")!.style.opacity = 0.5;
    const model = buildDossierDocModel(input);
    expect(model.issues).toContainEqual(
      expect.objectContaining({ code: "unsupported-image-opacity", fieldId: "cover.photo" }),
    );
    await expect(renderDossierDocx(model)).rejects.toThrow("unaccepted model issues");
    await expect(renderDossierDocx(model, { allowUnacceptedModelIssues: true })).rejects.toThrow(
      "unsupported image opacity",
    );
    model.cover.blocks.filter((b) => b.kind === "image")[0].opacity = 2;
    await expect(renderDossierDocx(model, { allowUnacceptedModelIssues: true })).rejects.toThrow(
      "invalid image opacity",
    );
  });
});
