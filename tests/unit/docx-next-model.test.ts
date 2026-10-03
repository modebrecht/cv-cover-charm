import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { BRIEF, NEXT_TEMPLATES } from "../../src/lib/docx-next/templates";
import { WORD_FONTS } from "../../src/lib/docx-next/fonts";
import { FONT_LABELS } from "../../src/components/cover/types";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../src/lib/dossier-chrome";
import { richLetterBlocks } from "../../src/lib/docx-next/rich-text";
import { BRIEF_FIXTURES, briefFixture } from "../fixtures/docx-next/brief";

const textStyle = {
  font: "Arial",
  sizePt: 10.5,
  color: "111111",
  bold: false,
  italic: false,
  underline: false,
};
describe("DOCX Next canonical model", () => {
  for (const fixture of BRIEF_FIXTURES)
    test(`deterministic, immutable and unique semantic identities: ${fixture}`, () => {
      const input = briefFixture(fixture),
        before = JSON.stringify(input);
      const first = buildDossierDocModel(input),
        second = buildDossierDocModel(structuredClone(input));
      expect(first).toEqual(second);
      expect(JSON.stringify(input)).toBe(before);
      const blocks = [first.cover, first.letter, first.cv].flatMap((part) =>
        walkBlocks([...part.blocks, ...part.header, ...part.footer]),
      );
      const ids = blocks.map((block) => block.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(JSON.stringify(first)).not.toContain("<w:");
    });
  test("equal visible values have independently styled stable fields", () => {
    const input = briefFixture("repeated-values");
    input.settings.fieldStyles = {
      "cv.entry.schule:one.title": { italic: true },
      "cv.entry.schule:two.title": { underline: true },
      "letter.subject": { bold: false },
    };
    const model = buildDossierDocModel(input);
    const blocks = walkBlocks(model.cv.blocks);
    const first = blocks.find((b) => b.id === "cv.entry.schule:one.title")!;
    const second = blocks.find((b) => b.id === "cv.entry.schule:two.title")!;
    expect(first.kind === "paragraph" && first.runs[0].style.italic).toBe(true);
    expect(second.kind === "paragraph" && second.runs[0].style.italic).toBe(false);
    expect(second.kind === "paragraph" && second.runs[0].style.underline).toBe(true);
    input.cv.data.schule[0].titel = "Changed in editor";
    const changed = walkBlocks(buildDossierDocModel(input).cv.blocks).find(
      (b) => b.id === first.id,
    )!;
    expect(changed.kind === "paragraph" && changed.runs[0].style.italic).toBe(true);
  });
  test("ordered half-width custom sections and empty sections are semantic", () => {
    const input = briefFixture("custom-sections");
    input.cv.data.sectionOrder = ["custom:custom-2", "schule", "person"];
    input.cv.data.sectionLayouts = { "custom:custom-2": { width: "half", page: 2 } };
    const model = buildDossierDocModel(input);
    const sections = model.cv.blocks.filter((b) => b.kind === "section");
    expect(sections[0].id).toBe("cv.section.custom:custom-2");
    expect(sections[0].width).toBe("half");
    expect(sections[0].startPage).toBe(2);
    const empty = buildDossierDocModel(briefFixture("empty-optional"));
    expect(empty.cv.blocks.filter((b) => b.kind === "section")).toEqual([]);
  });
  test("unresolved legacy identity is reported without text matching", () => {
    const input = briefFixture();
    input.settings.unresolvedTypography = ["old-random-field-id"];
    expect(buildDossierDocModel(input).issues[0].code).toBe("unresolved-legacy-typography");
  });
  test("unmapped paper and CV element content remain explicit migration blockers", () => {
    const input = briefFixture();
    input.letter.design.paperColor = "#123456";
    input.cv.design.useElements = true;
    input.cv.elements = [structuredClone(input.cover.blocks[0])];
    const codes = buildDossierDocModel(input).issues.map((issue) => issue.code);
    expect(codes).toContain("page-paper-artwork-pending");
    expect(codes).toContain("cv-elements-pending");
  });
  test("absent framed photos disappear cleanly, while unsupported actual framing blocks export", () => {
    const input = briefFixture("no-photo");
    const photo = input.cover.blocks.find((block) => block.kind === "photo")!;
    photo.style.imgZoom = 2;
    photo.style.radius = 999;
    expect(buildDossierDocModel(input).issues).toEqual([]);
    input.cover.data.foto = "data:image/png;base64,fixture";
    expect(buildDossierDocModel(input).issues.map((issue) => issue.code)).toContain(
      "photo-framing-pending",
    );
  });
  test("contact chrome owns duplicate source fields and preserves their semantic typography", () => {
    const input = briefFixture();
    input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
    input.settings.chrome.shared.headerMode = "contact";
    input.settings.fieldStyles = { "letter.sender.email": { underline: true } };
    const model = buildDossierDocModel(input);
    expect(model.letter.blocks.some((block) => block.id === "letter.sender.email")).toBe(false);
    const email = model.letter.header.find((block) => block.id === "letter.header.email")!;
    expect(email.runs[0].fieldId).toBe("letter.sender.email");
    expect(email.runs[0].style.underline).toBe(true);
    expect(model.letter.page.margins.top).toBeGreaterThan(BRIEF.margins.top);
  });
  test("compact chrome and absent optional content never fabricate contact fields", () => {
    const input = briefFixture("empty-optional");
    input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
    input.settings.chrome.shared.headerMode = "compact";
    const model = buildDossierDocModel(input);
    expect(model.letter.header.every((paragraph) => !paragraph.runs.length)).toBe(true);
    expect(model.letter.blocks.some((block) => block.id === "letter.sender.name")).toBe(true);
  });
  test("supported font keys all have documented deterministic fallbacks", () => {
    expect(Object.keys(WORD_FONTS).sort()).toEqual(Object.keys(FONT_LABELS).sort());
    expect(Object.values(WORD_FONTS).every((entry) => entry.fallback && entry.reason)).toBe(true);
  });
  test("templates are configuration and unreviewed templates cannot silently fallback", () => {
    expect(Object.keys(NEXT_TEMPLATES)).toEqual(["brief"]);
    expect(JSON.stringify(BRIEF)).not.toContain("<w:");
    const input = briefFixture();
    input.cover.template = "freundlich";
    expect(() => buildDossierDocModel(input)).toThrow("has not passed migration gates");
  });
  test("Next has no dependency on any legacy/V2 DOCX module or post-render text heuristic", () => {
    for (const file of readdirSync("src/lib/docx-next").filter((file) => file.endsWith(".ts"))) {
      const source = readFileSync(`src/lib/docx-next/${file}`, "utf8");
      expect(source).not.toMatch(/(?:from|import\()\s*["'][^"']*dossier-docx/);
      expect(source).not.toMatch(
        /docxOccurrence|applyDossierDocxSidebar|patchFirstParagraphContaining/,
      );
    }
  });
  test("rich text remains deterministic with native runs, alignment, lists and tables", () => {
    const blocks = richLetterBlocks(
      '<div data-align="right"><strong>Müller</strong> <u>é è à</u><br><span data-letter-text-color="#123456">Farbe</span></div><div data-list="bullet">Punkt</div><table><tbody><tr><td>Links</td><td>Rechts</td></tr></tbody></table>',
      "",
      textStyle,
      3,
      1.2,
    );
    expect(blocks[0].kind === "paragraph" && blocks[0].align).toBe("right");
    expect(blocks[0].kind === "paragraph" && blocks[0].runs[0].style.bold).toBe(true);
    expect(blocks[1].kind === "paragraph" && blocks[1].list).toBe("bullet");
    expect(blocks[2].kind).toBe("table");
    expect(JSON.stringify(blocks)).toContain("123456");
  });
});
