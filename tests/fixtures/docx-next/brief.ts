import { DEMO_DATA } from "../../../src/components/cover/types";
import { DEMO_CV, emptyCv } from "../../../src/components/cv/types";
import { DEMO_LETTER, emptyLetterDesign } from "../../../src/components/letter/types";
import { coverPdfDocumentFromSaved } from "../../../src/lib/dossier-pdf-document";
import type { DossierAppSnapshot } from "../../../src/lib/docx-next/build-model";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../../src/lib/dossier-chrome";

export const BRIEF_FIXTURES = [
  "minimal",
  "normal",
  "long-letter",
  "long-cv",
  "long-values",
  "no-photo",
  "repeated-values",
  "empty-optional",
  "custom-sections",
] as const;
export type BriefFixture = (typeof BRIEF_FIXTURES)[number];
export function briefPaintFixture(
  kind: "normal" | "long-letter" | "long-cv" = "normal",
): DossierAppSnapshot {
  const input = briefFixture(kind);
  input.cover.colors.bg = "#f4e9da";
  input.letter.design.paperColor = "#e8f0f4";
  input.cv.design.paperColor = "#eaf2e5";
  input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
  Object.assign(input.settings.chrome.shared, {
    headerMode: "contact",
    headerDifferentFirstPage: true,
    headerContinuationMode: "compact",
    headerTextLayout: "inline",
    headerBackgroundColor: "#bed6e4",
    headerGradientColor: "#e8f0f4",
    footerMode: "details",
    footerBackgroundColor: "#e8f0f4",
    footerGradientColor: "#bed6e4",
  });
  input.letter.design.chromeContent = {
    headerTitleEnabled: true,
    headerTitle: "Letter paint header",
  };
  input.cv.design.chromeContent = { headerTitleEnabled: true, headerTitle: "CV paint header" };
  return input;
}
export function briefChromeFixture(stackedFooter = false): DossierAppSnapshot {
  const input = briefFixture();
  input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
  Object.assign(input.settings.chrome.shared, {
    headerMode: "contact",
    headerDifferentFirstPage: true,
    headerContinuationMode: "compact",
    headerTextLayout: "inline",
    footerMode: "details",
    footerTextLayout: stackedFooter ? "stacked" : "inline",
  });
  for (const part of [input.letter, input.cv])
    part.design.chromeContent = {
      headerTitleEnabled: true,
      headerTitle: "Wiederholter Text",
      headerTextEnabled: true,
      headerText: "Wiederholter Text",
      footerTitleEnabled: true,
      footerTitle: "Wiederholter Text",
      footerTextEnabled: true,
      footerText: "Wiederholter Text",
    };
  input.settings.fieldStyles = {
    "letter.header.title": { bold: false, italic: true, color: "123456", sizePt: 11 },
    "letter.header.text": { bold: false, underline: true, color: "345678", sizePt: 9 },
    "letter.footer.title": { bold: true, color: "654321", sizePt: 9 },
    "letter.footer.text": { italic: true, color: "876543", sizePt: 8 },
    "cv.header.title": { bold: true, color: "456789", sizePt: 10 },
    "cv.header.text": { italic: true, underline: true, color: "56789A", sizePt: 9 },
    "cv.footer.title": { italic: true, color: "987654", sizePt: 9 },
    "cv.footer.text": { underline: true, color: "A98765", sizePt: 8 },
  };
  return input;
}
export function briefFixture(kind: BriefFixture = "normal"): DossierAppSnapshot {
  const cover = coverPdfDocumentFromSaved({
    template: "brief",
    data: structuredClone(DEMO_DATA),
    fontScale: 1,
  })!;
  const input: DossierAppSnapshot = {
    cover,
    letter: {
      data: structuredClone(DEMO_LETTER),
      design: {
        ...emptyLetterDesign(),
        template: "brief",
        colors: { ink: "#111111", accent: "#244a61" },
        fontOverride: "sans",
      },
    },
    cv: {
      data: structuredClone(DEMO_CV),
      design: {
        template: "brief",
        colors: { ink: "#111111", accent: "#244a61" },
        bgOpacity: 0.25,
        useElements: false,
      },
      elements: [],
      elementStyles: {},
    },
    settings: {},
  };
  if (kind === "minimal" || kind === "empty-optional") {
    input.cv.data = structuredClone(emptyCv);
    input.cv.data.person.vorname = "Éva";
    input.cv.data.person.nachname = "Müller";
    input.letter.data.text = "ä ö ü Ä Ö Ü é è à – — ·";
    input.letter.data.showBeilagen = false;
    input.letter.data.images = [];
  }
  if (kind === "long-letter")
    input.letter.data.text = Array.from(
      { length: 70 },
      (_, index) =>
        `Absatz ${index + 1}: Ich interessiere mich für diese Lehrstelle. Zuverlässigkeit, sorgfältige Arbeit und neue Aufgaben sind mir wichtig. Ich möchte meine Kenntnisse erweitern und bringe Erfahrung mit kleinen Projekten mit.`,
    ).join("\n\n");
  if (kind === "long-cv")
    input.cv.data.schule = Array.from({ length: 65 }, (_, index) => ({
      id: `school-${index}`,
      zeit: `2020 – ${2021 + index}`,
      titel: `Schule ${index + 1}`,
      ort: "Schulhaus Zürich",
      beschreibung:
        "Mathematik, Sprachen und Informatik. Projekte gemeinsam planen, durchführen und verständlich dokumentieren.",
    }));
  if (kind === "long-values") {
    input.cv.data.person.nachname = "Müller Schönenberger von Niederhäusern und Oberriet";
    input.cv.data.person.email =
      "sehr.lange.email.adresse.mit.vielen.zeichen.und.teilbereichen@example-domain-with-long-name.ch";
    input.letter.data.empfaengerFirma =
      "Internationale Gesellschaft für Informatik und digitale Zusammenarbeit in der deutschsprachigen Schweiz";
    input.letter.data.empfaengerAdresse =
      "Sehr lange Strassenbezeichnung mit einem zusätzlichen Gebäudenamen 125b";
  }
  if (kind === "repeated-values") {
    input.cv.data.schule = ["one", "two"].map((id) => ({
      id,
      zeit: "Gleich",
      titel: "Gleich",
      ort: "Gleich",
      beschreibung: "Gleich",
    }));
    input.letter.data.betreff = "Gleich";
    input.letter.data.text = "Gleich";
  }
  if (kind === "custom-sections")
    input.cv.data.customSections = Array.from({ length: 12 }, (_, index) => ({
      id: `custom-${index}`,
      title: `Eigene Rubrik ${index + 1}`,
      entries: [
        {
          id: `entry-${index}`,
          zeit: "2026",
          titel: "Projekt",
          ort: "Zürich",
          beschreibung: "Ein eigener editierbarer Inhalt.",
        },
      ],
    }));
  input.cover.data.foto = null;
  input.cv.data.person.foto = null;
  return input;
}
