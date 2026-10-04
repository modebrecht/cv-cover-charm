import { describe, expect, test, spyOn } from "bun:test";
import { FONT_LABELS, type FontKey } from "../../src/components/cover/types";
import { WORD_FONTS, createFontResolver, wordFont } from "../../src/lib/docx-next/fonts";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { briefChromeFixture, briefFixture } from "../fixtures/docx-next/brief";

const parts = async (model: ReturnType<typeof buildDossierDocModel>) =>
  new Map(
    readZipEntries(new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer())).map(
      (p) => [p.name, new TextDecoder().decode(p.bytes)],
    ),
  );
const allRuns = (part: ReturnType<typeof buildDossierDocModel>["letter"]) =>
  walkBlocks([...part.blocks, ...part.header, ...(part.firstHeader ?? []), ...part.footer]).flatMap(
    (block) => (block.kind === "paragraph" ? block.runs : []),
  );
describe("DOCX Next explicit font policy", () => {
  for (const key of Object.keys(FONT_LABELS) as FontKey[])
    test(`${key}: requested font and declared unavailable-font alternative`, () => {
      const { font, fallback } = WORD_FONTS[key];
      const present = createFontResolver({ availableFonts: [font, fallback] });
      expect(present.resolve(wordFont(key, "Arial"))).toBe(font);
      const absent = createFontResolver({ availableFonts: [fallback] });
      expect(absent.resolve(wordFont(key, "Arial"))).toBe(fallback);
      expect(absent.result()).toMatchObject({
        embedding: "disabled",
        availability: "supplied",
        selections: [{ requested: font, selected: fallback, reason: "unavailable" }],
      });
    });
  test("Brief letter base font stays independent of CV and rich/chrome/role text inherits it", () => {
    const input = briefChromeFixture();
    input.cv.design.font = "times";
    input.letter.design.font = "humanist";
    input.letter.design.fontOverride = "serif";
    input.letter.data.richTextHtml =
      "<div><strong>ä ö ü é è à</strong></div><table><tbody><tr><td>Native Zelle</td></tr></tbody></table>";
    const model = buildDossierDocModel(input);
    expect(allRuns(model.letter).every((run) => run.style.font === "Verdana")).toBe(true);
    expect(allRuns(model.cv).every((run) => run.style.font === "Times New Roman")).toBe(true);
    input.letter.design.bodyFont = "maschine";
    const changed = buildDossierDocModel(input);
    expect(
      allRuns(changed.letter).find((run) => run.id.startsWith("letter.body."))?.style.font,
    ).toBe("Courier New");
    expect(
      allRuns(changed.letter).find((run) => run.fieldId === "letter.subject")?.style.font,
    ).toBe("Verdana");
  });
  test("selection happens before XML and is deterministic through portable JSON, including field and chrome overrides", async () => {
    const input = briefChromeFixture();
    input.cv.design.font = "times";
    input.letter.design.font = "humanist";
    input.settings.fieldStyles = {
      "letter.subject": { font: "Courier New" },
      "cv.header.title": { font: "Georgia" },
    };
    input.settings.fontPolicy = {
      availableFonts: ["Liberation Serif", "Liberation Sans", "Liberation Mono", "DejaVu Sans"],
    };
    const model = buildDossierDocModel(input);
    expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
    expect(allRuns(model.letter).find((run) => run.fieldId === "letter.subject")?.style.font).toBe(
      "Liberation Mono",
    );
    expect(allRuns(model.cv).find((run) => run.fieldId === "cv.header.title")?.style.font).toBe(
      "Liberation Serif",
    );
    const xml = await parts(model);
    expect(xml.get("word/document.xml")).toContain('w:ascii="DejaVu Sans"');
    expect(xml.get("word/fontTable.xml")).toContain(
      '<w:family w:val="modern"/><w:pitch w:val="fixed"/>',
    );
    expect(xml.get("word/fontTable.xml")).not.toContain('w:family w:val="auto"');
  });
  test("unsupported keys/families and unavailable alternatives fail explicitly without a generic sans mapping", async () => {
    expect(() => wordFont("unknown" as FontKey, "Arial")).toThrow("unsupported font key");
    expect(() => createFontResolver().resolve("Unknown Family")).toThrow("unsupported font family");
    expect(() => createFontResolver({ availableFonts: [] }).resolve("Georgia")).toThrow(
      "no available font",
    );
    const input = briefFixture();
    input.settings.fieldStyles = { "letter.subject": { font: "Unknown Family" } };
    expect(() => buildDossierDocModel(input)).toThrow("unsupported font family");
    const model = buildDossierDocModel(briefFixture());
    (
      model.letter.blocks.find((block) => block.id === "letter.subject") as Paragraph
    ).runs[0].style.font = "Unknown Family";
    await expect(parts(model)).rejects.toThrow("unsupported font family");
  });
  test("disabled embedding has no asset fetch, font payload or embed relationship and unsupported embedding cannot leak", async () => {
    const fetch = spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("Font asset unavailable");
    });
    try {
      const input = briefFixture();
      input.cv.design.font = "freundlich";
      input.settings.fontPolicy = { embedding: "disabled" };
      const model = buildDossierDocModel(input);
      const pkg = await parts(model);
      expect(fetch).not.toHaveBeenCalled();
      expect([...pkg.keys()].some((name) => name.startsWith("word/fonts/"))).toBe(false);
      expect(pkg.get("word/fontTable.xml")).not.toContain("w:embed");
      expect(pkg.get("word/settings.xml")).toContain('<w:embedTrueTypeFonts w:val="0"/>');
      expect(pkg.get("word/fontTable.xml")).toContain('w:name="Trebuchet MS"');
      input.settings.fontPolicy = { embedding: "enabled" } as never;
      expect(() => buildDossierDocModel(input)).toThrow("unsupported font embedding policy");
    } finally {
      fetch.mockRestore();
    }
  });
});
