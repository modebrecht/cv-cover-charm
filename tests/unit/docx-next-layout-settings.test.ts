import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks, type Paragraph, type SectionBlock } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../src/lib/dossier-chrome";
import {
  briefFixture,
  briefLayoutFixture,
  BRIEF_LAYOUT_FIXTURES,
} from "../fixtures/docx-next/brief";

const section = (model: ReturnType<typeof buildDossierDocModel>, key: string) =>
  model.cv.blocks.find((block) => block.id === `cv.section.${key}`) as SectionBlock;
const paragraph = (blocks: ReturnType<typeof walkBlocks>, id: string) =>
  blocks.find((block) => block.id === id) as Paragraph;
async function documentXml(model: ReturnType<typeof buildDossierDocModel>) {
  const blob = await renderDossierDocx(model);
  return new TextDecoder().decode(
    readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(
      (part) => part.name === "word/document.xml",
    )!.bytes,
  );
}
describe("native Brief CV presentation and letter separators", () => {
  test("every presentation fixture builds deterministically without mutation or unresolved issues", () => {
    for (const kind of BRIEF_LAYOUT_FIXTURES) {
      const input = briefLayoutFixture(kind),
        before = structuredClone(input);
      const model = buildDossierDocModel(input);
      expect(model).toEqual(buildDossierDocModel(before));
      expect(input).toEqual(before);
      expect(model.issues).toEqual([]);
      const ids = walkBlocks(model.cv.blocks).map((block) => block.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  test("aligned personal values retain their identity and independent styles, including identical text", () => {
    const input = briefLayoutFixture("contact-aligned");
    input.cv.data.person.geburtsort = input.cv.data.person.heimatort = "Gleich";
    input.settings.fieldStyles = { "cv.person.heimatort": { italic: true } };
    const model = buildDossierDocModel(input),
      blocks = walkBlocks(model.cv.blocks);
    expect(section(model, "person").blocks.map((block) => block.id)).toEqual([
      "cv.person.contact",
      "cv.person.details",
    ]);
    expect(paragraph(blocks, "cv.person.geburtsort").runs[0]).toMatchObject({
      fieldId: "cv.person.geburtsort",
      text: "Gleich",
      style: { italic: false },
    });
    expect(paragraph(blocks, "cv.person.heimatort").runs[0]).toMatchObject({
      fieldId: "cv.person.heimatort",
      text: "Gleich",
      style: { italic: true },
    });
    input.cv.design.personalInfoColons = false;
    expect(
      paragraph(walkBlocks(buildDossierDocModel(input).cv.blocks), "cv.person.geburtsort.label")
        .runs[0].text,
    ).toBe("Geburtsort");
    expect(
      section(buildDossierDocModel(briefLayoutFixture("contact-plain")), "person").blocks.every(
        (block) => block.kind === "paragraph",
      ),
    ).toBe(true);
  });
  test("missing contact fields create no empty rows or empty personal section", () => {
    const input = briefFixture("empty-optional");
    expect(section(buildDossierDocModel(input), "person")).toBeUndefined();
    input.cv.data.person.email = "only@example.ch";
    const blocks = section(buildDossierDocModel(input), "person").blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      kind: "table",
      rows: [{ cells: [[], [expect.objectContaining({ id: "cv.person.email" })]] }],
    });
  });
  test("references pair by source identity; odd and half-width entries stay editable", () => {
    const input = briefLayoutFixture("references-paired");
    let refs = section(buildDossierDocModel(input), "referenzen").blocks;
    expect(refs).toHaveLength(3);
    expect(refs[2]).toMatchObject({
      kind: "table",
      rows: [
        {
          keepTogether: false,
          cells: [[expect.objectContaining({ id: "cv.entry.referenzen:layout-reference-4" })], []],
        },
      ],
    });
    input.cv.data.sectionLayouts = { referenzen: { width: "half", page: 1 } };
    refs = section(buildDossierDocModel(input), "referenzen").blocks;
    expect(refs).toHaveLength(5);
    expect(refs.every((block) => block.kind === "entry")).toBe(true);
    expect(
      section(
        buildDossierDocModel(briefLayoutFixture("references-stacked")),
        "referenzen",
      ).blocks.every((block) => block.kind === "entry"),
    ).toBe(true);
  });
  test("contact chrome removes its owned fields from aligned cells without orphan tables or rules", () => {
    const input = briefLayoutFixture("contact-aligned");
    input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
    input.settings.chrome.sync = false;
    Object.assign(input.settings.chrome.cv, {
      headerMode: "contact",
      headerContinuationMode: "contact",
      headerShowAddress: true,
      headerShowPhone: true,
      headerShowEmail: true,
    });
    let model = buildDossierDocModel(input);
    expect(walkBlocks(model.cv.blocks).some((block) => block.id === "cv.person.email")).toBe(false);
    expect(section(model, "person").blocks.map((block) => block.id)).toEqual(["cv.person.details"]);
    Object.assign(input.cv.data.person, {
      geburtsdatum: "",
      geburtsort: "",
      heimatort: "",
      nationalitaet: "",
    });
    input.cv.design.headingRule = "short";
    model = buildDossierDocModel(input);
    expect(section(model, "person")).toBeUndefined();
  });
  test("rubric offsets, spacing, badges and content indents resolve before XML and respect half-width boundaries", () => {
    const input = briefLayoutFixture("rubrics-positive");
    const contact = section(buildDossierDocModel(input), "person");
    expect(contact).toMatchObject({
      contentIndentMm: 12,
      heading: { indentMm: 6, beforeMm: 12, keepNext: true },
    });
    expect(contact.heading!.runs[0].style.backgroundColor).toMatch(/^[0-9A-F]{6}$/);
    const negative = briefLayoutFixture("rubrics-negative");
    expect(section(buildDossierDocModel(negative), "person").heading!.indentMm).toBe(-6);
    negative.cv.data.sectionLayouts = { person: { width: "half", page: 1 } };
    expect(section(buildDossierDocModel(negative), "person").heading!.indentMm).toBe(0);
    delete input.cv.design.sectionContentIndentMm;
    delete input.cv.design.sectionTitleOffsetMm;
    input.cv.design.citrusContentIndentMm = 7;
    input.cv.design.citrusRubricOffsetMm = -2;
    expect(section(buildDossierDocModel(input), "person")).toMatchObject({
      contentIndentMm: 7,
      heading: { indentMm: -2 },
    });
  });
  test("native geometry survives packaging without changing the semantic model", async () => {
    const model = buildDossierDocModel(briefLayoutFixture("rubrics-short")),
      before = structuredClone(model);
    const xml = await documentXml(model);
    expect(model).toEqual(before);
    expect(xml).toContain('<w:tblInd w:w="680"');
    expect(xml).toContain('<w:ind w:left="340"');
    expect(xml).toContain('<w:shd w:val="clear"');
    expect(xml).toContain("cv.section.person.heading.rule");
    expect(section(model, "person").blocks[0]).toMatchObject({
      kind: "rule",
      lengthMm: 18,
      keepNext: true,
    });
    expect(xml).not.toContain("w:txbxContent");
  });
  test("sender, recipient and subject rules attach to known paragraphs; empty groups leave no rule", async () => {
    const input = briefLayoutFixture("letter-rules");
    let blocks = walkBlocks(buildDossierDocModel(input).letter.blocks);
    expect(
      blocks
        .filter((block) => block.kind === "paragraph" && block.ruleColor)
        .map((block) => block.id),
    ).toEqual(["letter.sender.email", "letter.recipient.place", "letter.subject"]);
    Object.assign(input.letter.data, {
      empfaengerFirma: "",
      empfaengerName: "",
      empfaengerAdresse: "",
      empfaengerPlzOrt: "",
    });
    blocks = walkBlocks(buildDossierDocModel(input).letter.blocks);
    expect(
      blocks.some(
        (block) =>
          block.kind === "paragraph" && block.id.startsWith("letter.recipient.") && block.ruleColor,
      ),
    ).toBe(false);
    expect(await documentXml(buildDossierDocModel(input))).toContain("<w:pBdr><w:bottom");
  });
  test("invalid shared geometry fails before packaging", async () => {
    const model = buildDossierDocModel(briefLayoutFixture("rubrics-short"));
    section(model, "person").contentIndentMm = 200;
    await expect(renderDossierDocx(model)).rejects.toThrow("invalid section indentation");
    section(model, "person").contentIndentMm = 0;
    const rule = section(model, "person").blocks[0];
    if (rule.kind !== "rule") throw new Error("Missing rule fixture");
    rule.lengthMm = NaN;
    await expect(renderDossierDocx(model)).rejects.toThrow("invalid rule geometry");
    rule.lengthMm = 18;
    const contact = walkBlocks(model.cv.blocks).find((block) => block.id === "cv.person.contact");
    if (contact?.kind !== "table") throw new Error("Missing contact fixture");
    contact.indentMm = 300;
    await expect(renderDossierDocx(model)).rejects.toThrow("exceeds available width");
  });
  test("entry metadata stays attached to description start while long descriptions remain splittable", () => {
    const input = briefLayoutFixture("settings-long");
    input.cv.data.schule[0].beschreibung = "Long editable description. ".repeat(500);
    const entry = walkBlocks(buildDossierDocModel(input).cv.blocks).find(
      (block) => block.id === "cv.entry.schule:school-0",
    );
    if (entry?.kind !== "entry") throw new Error("Missing entry fixture");
    expect(
      entry.blocks.slice(0, -1).every((block) => block.kind === "paragraph" && block.keepNext),
    ).toBe(true);
    expect(entry.blocks.at(-1)).toMatchObject({
      kind: "paragraph",
      keepNext: false,
      keepLines: false,
    });
  });
});
