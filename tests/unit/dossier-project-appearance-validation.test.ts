import { describe, expect, test } from "bun:test";
import { parseDossierProject } from "../../src/lib/dossier-project";
import { parseDossierProjectText } from "../../src/lib/dossier-project-file";
import {
  cvPdfDocumentFromSaved,
  letterPdfDocumentFromSaved,
} from "../../src/lib/dossier-pdf-document";

const project = (cv = {}, letter = {}) => ({
  kind: "cv-cover-charm-dossier",
  version: 1,
  cv: { version: 6, data: { person: { vorname: "QA" } }, ...cv },
  letter: { version: 1, data: { text: "Unveränderter Brief" }, ...letter },
});

describe("project file typography and letter image boundary", () => {
  test("rejects broken CV design values instead of dropping authored typography", () => {
    for (const design of [
      { bodyScale: "broken" },
      { titleScale: [] },
      { headingScale: null },
      { bodyScale: Infinity },
      { docTitleFontSizePx: "24" },
      { docTitleMarginBottomPx: false },
      { sectionTitleFontSizePx: {} },
      { sectionTitleMarginBottomPx: NaN },
      { sectionTitleOffsetMm: "broken" },
      { sectionContentIndentMm: [] },
      { citrusRubricOffsetMm: false },
      { citrusContentIndentMm: {} },
      { sidebarPct: "0.3" },
      { bgOpacity: "0.25" },
      { useElements: "false" },
      { personalInfoColons: 1 },
      { personalInfoAligned: "true" },
      { showDocumentTitle: [] },
      { docTitleBold: "false" },
      { docTitleItalic: 0 },
      { docTitleUnderline: {} },
      { sectionTitleBold: "yes" },
      { sectionTitleItalic: null },
      { sectionTitleUnderline: 1 },
      { sectionTitlePill: "false" },
      { citrusRubricPill: 1 },
      { headingRule: "unsupported" },
      { docTitleColor: [] },
      { sectionTitleColor: false },
      { paperColor: {} },
    ]) {
      expect(parseDossierProject(project({ design }))).toBeNull();
    }
  });

  test("rejects malformed name and letter role styles, including unsupported fonts and colors", () => {
    for (const style of [
      [],
      "broken",
      false,
      { fontSizePt: "12" },
      { fontSizePt: Infinity },
      { font: {} },
      { font: "missing-font" },
      { color: "broken" },
      { color: [] },
      { bold: "false" },
      { italic: 1 },
      { underline: null },
    ]) {
      expect(parseDossierProject(project({ data: { person: { nameStyle: style } } }))).toBeNull();
      for (const role of ["senderTypography", "recipientTypography", "subjectTypography"]) {
        expect(parseDossierProject(project({}, { design: { [role]: style } }))).toBeNull();
      }
    }
  });

  test("rejects broken letter font sizes, alignments and spacing", () => {
    for (const design of [
      { bodyFontSizePt: "broken" },
      { dateFontSizePt: [] },
      { salutationFontSizePt: null },
      { closingFontSizePt: false },
      { signatureFontSizePt: {} },
      { attachmentsFontSizePt: -Infinity },
      { bodyFont: "missing-font" },
      { dateFont: [] },
      { salutationFont: false },
      { closingFont: {} },
      { signatureFont: 1 },
      { attachmentsFont: null },
      { fontOverride: [] },
      { bgOpacity: "broken" },
      { continuationTopMarginMm: "24" },
      { senderAlign: "center" },
      { recipientAlign: [] },
      { dateAlign: false },
      { ruleAfterSender: "false" },
      { ruleAfterRecipient: 1 },
      { ruleAfterSubject: null },
      { paperColor: false },
      { textColor: [] },
    ]) {
      expect(parseDossierProject(project({}, { design }))).toBeNull();
    }
    for (const data of [
      { grussAbstandMm: "4" },
      { unterschriftAbstandMm: false },
      { showBeilagen: "false" },
    ]) {
      expect(parseDossierProject(project({}, { data }))).toBeNull();
    }
  });

  test("rejects corrupt image geometry without treating numeric strings as corrupt", () => {
    for (const image of [
      { widthMm: "broken" },
      { widthMm: [] },
      { topMm: {} },
      { gapMm: false },
      { widthMm: null },
      { topMm: "" },
      { gapMm: "   " },
      { widthMm: Infinity },
      { xMm: "31" },
      { xMm: null },
      { xMm: NaN },
      { side: "center" },
      { placement: "absolute" },
    ]) {
      expect(parseDossierProject(project({}, { data: { images: [image] } }))).toBeNull();
    }
    expect(
      parseDossierProjectText(
        JSON.stringify(project({}, { design: { bodyFontSizePt: "overflow" } })).replace(
          '"overflow"',
          "1e999",
        ),
      ),
    ).toBeNull();
  });

  test("retains authored styles, legacy defaults, partial images and additive fields exactly", () => {
    const style = {
      font: "serif",
      fontSizePt: 13.5,
      color: "#123456",
      bold: false,
      italic: true,
      underline: false,
    };
    const value = project(
      {
        data: { person: { vorname: "QA", nameStyle: { ...style, fontSizePt: 27 } } },
        design: {
          titleScale: 1.05,
          headingScale: 0.95,
          bodyScale: 1,
          docTitleFontSizePx: 25,
          sectionTitleFontSizePx: 15,
          docTitleBold: false,
          sectionTitlePill: true,
          paperColor: null,
          font: null,
          futureAddition: { retained: true },
        },
      },
      {
        data: {
          images: [
            {
              id: "free",
              src: "unchanged",
              placement: "free",
              xMm: 31.5,
              widthMm: 37,
              topMm: 8,
              gapMm: 3,
            },
            {
              id: "legacy",
              src: "unchanged",
              side: "left",
              xMm: 120,
              widthMm: "34",
              topMm: "8",
              gapMm: "4",
            },
            { id: "partial", src: "unchanged" },
          ],
          grussAbstandMm: 6.5,
          unterschriftAbstandMm: 12,
          showBeilagen: false,
        },
        design: {
          senderTypography: style,
          recipientTypography: {},
          subjectTypography: null,
          bodyFont: "sans",
          bodyFontSizePt: 11.5,
          fontOverride: null,
          paperColor: null,
          textColor: null,
          continuationTopMarginMm: null,
        },
      },
    );
    const bytes = JSON.stringify(value);
    const parsed = parseDossierProject(value);
    expect(parsed?.cv).toEqual(value.cv);
    expect(parsed?.letter).toEqual(value.letter);
    expect(JSON.stringify(value)).toBe(bytes);
    expect(parseDossierProject(project({ data: { person: { nameStyle: null } } }))).not.toBeNull();
    // Existing finite out-of-range values still use the renderer's established clamps.
    expect(
      parseDossierProject(
        project({ design: { bodyScale: -2 } }, { data: { images: [{ widthMm: 999 }] } }),
      ),
    ).not.toBeNull();
  });

  test("saved browser readers keep their existing tolerant normalization", () => {
    expect(
      cvPdfDocumentFromSaved({ data: { person: {} }, design: { bodyScale: "broken" } })?.design
        .bodyScale,
    ).toBeUndefined();
    expect(
      letterPdfDocumentFromSaved({ data: { text: "QA" }, design: { subjectTypography: [] } })
        ?.design.subjectTypography,
    ).toBeUndefined();
  });
});
