import { expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { paragraph } from "../../src/lib/docx-next/native-text";
import { coverPdfDocumentFromSaved } from "../../src/lib/dossier-pdf-document";
import { briefFixture } from "../fixtures/docx-next/brief";
import saved from "../../docs/qa/docx-next-modern-defaults-footer-18okt/project.json";

function sourceFor(family: "modern" | "brief") {
  const source = briefFixture("normal");
  source.cv = structuredClone(saved.cv) as typeof source.cv;
  source.cover = coverPdfDocumentFromSaved({
    ...saved.cover,
    template: family,
  })!;
  source.cv.design.template = source.letter.design.template = family;
  return source;
}
const headings = (m: ReturnType<typeof buildDossierDocModel>) =>
  walkBlocks(m.cv.blocks).filter((b) => b.kind === "paragraph" && b.id.endsWith(".heading"));

for (const family of ["modern", "brief"] as const) {
  test(`${family}: default reading headings match Web spacing without shrinking text`, () => {
    const source = sourceFor(family);
    const before = JSON.stringify(source);
    const legacy = buildDossierDocModel(source);
    const reading = buildDossierDocModel(source, {
      cvContentComposition: "reading-rows",
    });
    const hs = headings(reading);
    expect(hs).toHaveLength(7);
    for (const h of hs) {
      if (h.kind !== "paragraph") throw Error("Missing heading");
      expect(h.afterMm).toBe(0.5);
      expect(h.beforeMm).toBe(1.2);
      expect(h.runs).toEqual(headings(legacy).find((b) => b.id === h.id)?.runs);
      expect(paragraph(h)).toContain('w:after="28"');
      expect(paragraph(h)).toContain('<w:keepNext w:val="1"/>');
    }
    expect(reading.cover).toEqual(legacy.cover);
    expect(reading.letter).toEqual(legacy.letter);
    expect(reading.cv.page).toEqual(legacy.cv.page);
    expect(JSON.stringify(source)).toBe(before);
    expect(headings(legacy).every((h) => h.kind === "paragraph" && h.afterMm > 1.8)).toBe(true);
    const priorSource = structuredClone(source);
    priorSource.cv.design.sectionTitleMarginBottomPx = 7;
    const priorReading = buildDossierDocModel(priorSource, {
      cvContentComposition: "reading-rows",
    });
    const restored = structuredClone(reading);
    for (const h of headings(restored)) h.afterMm = (7 * 25.4) / 96;
    expect(restored).toEqual(priorReading);
    // Old JSON can contain null for an unset optional slider.
    source.cv.design.sectionTitleMarginBottomPx = null as unknown as number;
    expect(
      headings(buildDossierDocModel(source, { cvContentComposition: "reading-rows" })).every(
        (h) => h.afterMm === 0.5,
      ),
    ).toBe(true);
  });

  test(`${family}: explicit rubric gaps and the two-page choice survive`, () => {
    for (const px of [0, 7, 12]) {
      const source = sourceFor(family);
      source.cv.design.sectionTitleMarginBottomPx = px;
      source.cv.data.sectionLayouts = {
        referenzen: { page: 2, width: "full" },
      };
      source.settings.cvSectionGapMm = 5;
      const model = buildDossierDocModel(source, {
        cvContentComposition: "reading-rows",
      });
      expect(
        headings(model).every(
          (h) => h.kind === "paragraph" && h.afterMm === (px * 25.4) / 96 && h.beforeMm === 5,
        ),
      ).toBe(true);
      expect(model.cv.blocks.find((b) => b.id === "cv.section.referenzen")).toMatchObject({
        startPage: 2,
      });
    }
  });
}
