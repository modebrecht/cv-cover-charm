import { expect, test } from "bun:test";
import { assertSameStoryPart } from "../../scripts/docx-next-story-part-contract";

const encode = (value: string) => new TextEncoder().encode(value);
const story = (id: number) =>
  `<w:hdr><wp:anchor relativeHeight="${id}" distT="0"><wp:docPr id="${id}" name="cv.surface"/><pic:cNvPr id="${id}"/><a:blip r:embed="paint-cv.surface"/><wp:posOffset>155000</wp:posOffset></wp:anchor><w:t>Beilagen</w:t></w:hdr>`;
test("a uniform drawing instance shift preserves the complete story", () => {
  assertSameStoryPart(encode(story(2)), encode(story(3)), "cv-header.xml");
});
for (const [label, change] of [
  ["text", (xml: string) => xml.replace("Beilagen", "Verloren")],
  ["geometry", (xml: string) => xml.replace("155000", "156000")],
  ["relationship", (xml: string) => xml.replace("paint-cv.surface", "paint-wrong")],
  ["drawing name", (xml: string) => xml.replace("cv.surface", "cv.other")],
  ["relative order", (xml: string) => xml.replace('relativeHeight="3"', 'relativeHeight="5"')],
  ["duplicate ID mismatch", (xml: string) => xml.replace('<pic:cNvPr id="3"', '<pic:cNvPr id="4"')],
  ["missing drawing", (xml: string) => xml.replace('<pic:cNvPr id="3"/>', "")],
] as const) {
  test(`story comparison rejects changed ${label}`, () => {
    expect(() =>
      assertSameStoryPart(encode(story(2)), encode(change(story(3))), "cv-header.xml"),
    ).toThrow();
  });
}
test("a story without drawings remains byte-exact", () => {
  const xml = '<w:hdr><w:sdtPr><w:id w:val="2"/></w:sdtPr></w:hdr>';
  expect(() =>
    assertSameStoryPart(encode(xml), encode(xml.replace('"2"', '"3"')), "header.xml"),
  ).toThrow();
});
