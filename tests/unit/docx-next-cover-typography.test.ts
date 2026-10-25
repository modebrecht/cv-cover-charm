import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { planNumbering } from "../../src/lib/docx-next/numbering";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { briefCoverTypographyFixture, briefFixture } from "../fixtures/docx-next/brief";

const parts = async (model: ReturnType<typeof buildDossierDocModel>) =>
  Object.fromEntries(
    readZipEntries(new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer())).map(
      (part) => [part.name, new TextDecoder().decode(part.bytes)],
    ),
  );
describe("semantic cover typography and independent list counters", () => {
  test("relative tracking follows the resolved user font size and respects an explicit point override", () => {
    const input = briefCoverTypographyFixture();
    input.settings.fieldStyles = { "cover.fullName": { sizePt: 40 } };
    const first = buildDossierDocModel(input).cover.blocks.find(
      (block) => block.id === "cover.fullName",
    ) as Paragraph;
    expect(first.runs[0].style.trackingPt).toBe(3.2);
    input.settings.fieldStyles["cover.fullName"].trackingPt = 1;
    const second = buildDossierDocModel(input).cover.blocks.find(
      (block) => block.id === "cover.fullName",
    ) as Paragraph;
    expect(second.runs[0].style.trackingPt).toBe(1);
  });
  test("casing, em tracking and line height are resolved deterministically before XML; original text stays intact", async () => {
    const input = briefCoverTypographyFixture();
    input.cover.fontScale = 1.5;
    const model = buildDossierDocModel(input);
    expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
    const name = model.cover.blocks.find((block) => block.id === "cover.fullName") as Paragraph;
    expect(name.runs[0]).toMatchObject({
      fieldId: "cover.fullName",
      text: "Éva Müller ä ö ü é è à – — ·",
      style: { sizePt: 27, allCaps: true, trackingPt: 2.16, italic: true, underline: true },
    });
    expect(name.lineHeight).toBe(1.7);
    const pkg = await parts(model);
    expect(pkg["word/document.xml"]).toContain('<w:caps w:val="1"/>');
    expect(pkg["word/document.xml"]).toContain('<w:spacing w:val="43"/>');
    expect(pkg["word/document.xml"]).toContain('w:line="408"');
    expect(pkg["word/document.xml"]).toContain("Éva Müller ä ö ü é è à – — ·");
  });
  test("negative tracking and explicit non-uppercase styles transfer without rewriting text", async () => {
    const input = briefFixture();
    const name = input.cover.blocks.find((block) => block.id === "name")!;
    Object.assign(name.style, { uppercase: false, size: 20, tracking: -0.05 });
    const pkg = await parts(buildDossierDocModel(input));
    expect(pkg["word/document.xml"]).toContain('<w:caps w:val="0"/>');
    expect(pkg["word/document.xml"]).toContain('<w:spacing w:val="-20"/>');
    expect(pkg["word/document.xml"]).toContain("Lea Müller");
  });
  test("each nonempty list item has native paragraphs, stable source field identity and independent rich runs", () => {
    const model = buildDossierDocModel(briefCoverTypographyFixture("lists"));
    const items = walkBlocks(model.cover.blocks).filter(
      (block): block is Paragraph =>
        block.kind === "paragraph" && block.listGroupId === "cover.beilagen",
    );
    expect(items.map((block) => block.id)).toEqual([
      "cover.beilagen.item:0",
      "cover.beilagen.item:2",
      "cover.beilagen.item:3",
    ]);
    expect(items.every((block) => block.list === "number" && !block.keepNext)).toBe(true);
    expect(items[1].runs[0]).toMatchObject({
      fieldId: "cover.beilagen",
      text: "Beilage Zwei",
      style: { color: "36526F", bold: true },
    });
    expect(items.some((block) => block.runs.some((run) => run.text.includes("\n")))).toBe(false);
  });
  test("new cover lists and letter lists restart independently without affecting item text", async () => {
    const model = buildDossierDocModel(briefCoverTypographyFixture("lists"));
    const plan = planNumbering(model);
    const first = plan.ids.get("cover.beilagen.item:0")!;
    expect(plan.ids.get("cover.beilagen.item:2")).toBe(first);
    expect(plan.ids.get("cover.extra-list.item:0")).not.toBe(first);
    const letter = walkBlocks(model.letter.blocks).filter(
      (block): block is Paragraph => block.kind === "paragraph" && block.list === "number",
    );
    expect(plan.ids.get(letter[0].id)).not.toBe(first);
    expect(plan.ids.get(letter[0].id)).toBe(plan.ids.get(letter[1].id));
    expect(plan.ids.get(letter[2].id)).not.toBe(plan.ids.get(letter[0].id));
    expect(plan.ids.get(letter[3].id)).toBe(plan.ids.get(letter[4].id));
    expect(plan.ids.get(letter[5].id)).toBe(plan.ids.get(letter[6].id));
    expect(plan.ids.get(letter[3].id)).not.toBe(plan.ids.get(letter[5].id));
    const pkg = await parts(model);
    expect(pkg["word/numbering.xml"]).toContain('<w:startOverride w:val="1"/>');
    const styledItem = pkg["word/document.xml"]
      .split('w:alias w:val="cover.beilagen.item:2"')[1]
      .split("</w:sdt>")[0];
    const paragraphProperties = styledItem.split("<w:pPr>")[1].split("</w:pPr>")[0];
    expect(paragraphProperties).toContain("<w:rPr>");
    expect(paragraphProperties).toContain('<w:color w:val="36526F"/>');
    const item = model.cover.blocks.find(
      (block) => block.id === "cover.beilagen.item:2",
    ) as Paragraph;
    expect(paragraphProperties).toContain(
      `<w:sz w:val="${Math.round(item.runs[0].style.sizePt * 2)}"/>`,
    );
    expect(pkg["word/document.xml"]).toContain("Letter list one");
    expect(planNumbering(structuredClone(model))).toEqual(plan);
  });
  test("inconsistent list groups and invalid paragraph/run geometry fail explicitly", async () => {
    const model = buildDossierDocModel(briefCoverTypographyFixture("lists"));
    const item = model.cover.blocks.find(
      (block) => block.id === "cover.beilagen.item:2",
    ) as Paragraph;
    item.list = "bullet";
    await expect(renderDossierDocx(model)).rejects.toThrow("mixed list kinds");
    item.list = "number";
    const groupId = item.listGroupId;
    delete item.listGroupId;
    await expect(renderDossierDocx(model)).rejects.toThrow("missing semantic list group");
    item.listGroupId = groupId;
    item.lineHeight = Number.NaN;
    await expect(renderDossierDocx(model)).rejects.toThrow("invalid paragraph geometry");
    item.lineHeight = 1;
    item.runs[0].style.trackingPt = Number.POSITIVE_INFINITY;
    await expect(renderDossierDocx(model)).rejects.toThrow("invalid typography");
  });
});
