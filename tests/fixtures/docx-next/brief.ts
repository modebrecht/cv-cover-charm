import { DEMO_DATA } from "../../../src/components/cover/types";
import { DEMO_CV, emptyCv } from "../../../src/components/cv/types";
import { DEMO_LETTER, emptyLetterDesign } from "../../../src/components/letter/types";
import { coverPdfDocumentFromSaved } from "../../../src/lib/dossier-pdf-document";
import type { DossierAppSnapshot } from "../../../src/lib/docx-next/build-model";
import { buildCustomBlocks } from "../../../src/components/cover/layouts-base";
import { TEMPLATES, type CustomField } from "../../../src/components/cover/types";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../../src/lib/dossier-chrome";
import { FONT_LABELS, type FontKey } from "../../../src/components/cover/types";
import { WORD_FONTS } from "../../../src/lib/docx-next/fonts";

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
export function briefFontsFixture(
  kind: "mixed" | "unavailable" | "long-letter" | "long-cv" | "offline",
) {
  const input = briefFixture(kind === "long-letter" || kind === "long-cv" ? kind : "minimal");
  input.cv.design.font = kind === "offline" ? "freundlich" : "times";
  input.letter.design.font = "humanist";
  input.letter.design.fontOverride = "serif";
  if (kind === "long-letter") input.letter.design.bodyFont = "times";
  if (kind !== "mixed" && kind !== "offline")
    input.settings.fontPolicy = {
      availableFonts: [...new Set(Object.values(WORD_FONTS).map((font) => font.fallback))],
      embedding: "disabled",
    };
  else input.settings.fontPolicy = { embedding: "disabled" };
  if (kind !== "long-letter" && kind !== "long-cv") {
    input.cv.design.useElements = true;
    input.cv.elements = (Object.keys(FONT_LABELS) as FontKey[]).map((key) => ({
      id: `font-${key}`,
      kind: "text",
      label: FONT_LABELS[key],
      text: `Font ${key}: ä ö ü Ä Ö Ü é è à – — ·`,
    }));
    input.cv.elementStyles = Object.fromEntries(
      (Object.keys(FONT_LABELS) as FontKey[]).map((key, index) => [
        `font-${key}`,
        { x: 20, y: 30 + index * 10, w: 170, size: 11, font: key },
      ]),
    );
  }
  return input;
}
export function briefElementsFixture(
  kind:
    | "short"
    | "long"
    | "page-two"
    | "images"
    | "shapes"
    | "shapes-paper"
    | "empty-disabled" = "short",
): DossierAppSnapshot {
  const input = briefFixture(kind === "page-two" ? "minimal" : "normal");
  const slots = TEMPLATES.find((template) => template.id === "brief")!.slots;
  const fields: CustomField[] = [
    { id: "custom-a", kind: "text", label: "Eigenes Feld A", text: "Eigenes Feld ä ö ü é è à" },
    { id: "custom-b", kind: "text", label: "Eigenes Feld B", text: "Eigenes Feld ä ö ü é è à" },
  ];
  const styles = {
    "custom-a": {
      x: 25,
      y: 210,
      w: 145,
      size: 12,
      font: "times" as const,
      tracking: 0.02,
      color: "#123456",
    },
    "custom-b": {
      x: 35,
      y: 235,
      w: 120,
      size: 12,
      italic: true,
      underline: true,
      bg: "#e6edf3",
      padX: 2,
      padY: 1,
      borderWidth: 0.3,
      borderColor: "#244a61",
    },
  };
  if (kind === "long")
    fields[0].text = Array.from(
      { length: 70 },
      (_, index) => `Zusatz ${index + 1}: Native editierbare Zeile ä ö ü é è à.`,
    ).join("\n");
  if (kind === "page-two") {
    fields[1].page = 2;
    input.cv.data.schule = [
      {
        id: "continuation",
        zeit: "2024 – 2026",
        titel: "Zweite CV-Zone",
        ort: "Zürich",
        beschreibung: "Bleibt mit dem Zusatzfeld auf der Fortsetzungsseite.",
      },
    ];
    input.cv.data.sectionLayouts = { schule: { page: 2 } };
  }
  if (kind === "empty-disabled") {
    fields[0].text = "";
    fields.push({ id: "missing-image", kind: "image", label: "Leer", text: "", src: null });
    styles["custom-b"].bg = "#e6edf3";
  }
  input.cover.blocks.push(...buildCustomBlocks("brief", fields, styles, slots));
  input.cover.customFieldIds = fields.map((field) => field.id);
  input.cv.design.useElements = kind !== "empty-disabled";
  input.cv.elements = structuredClone(fields);
  input.cv.elementStyles = structuredClone(styles);
  input.settings.fieldStyles = {
    "cv.element:custom-a": { bold: true, color: "234567" },
    "cv.element:custom-b": { italic: true, underline: true },
  };
  if (kind === "shapes" || kind === "shapes-paper") {
    const shapes: CustomField[] = [
      { id: "art-rect", kind: "shape", label: "Rechteck", text: "", shape: "rect" },
      { id: "art-circle", kind: "shape", label: "Kreis", text: "", shape: "circle" },
      { id: "art-line", kind: "shape", label: "Linie", text: "", shape: "line" },
      {
        id: "art-path",
        kind: "shape",
        label: "Pfad",
        text: "",
        shape: "path",
        path: "M0 100 L25 25 L50 75 L100 0",
      },
    ];
    const shapeStyles = {
      "art-rect": {
        x: 5,
        y: 5,
        w: 14,
        ratio: 1.5,
        fill: "#cc6600",
        color: "#244a61",
        strokeWidth: 0.4,
        bgRadius: 2,
        opacity: 0.5,
      },
      "art-circle": {
        x: 5,
        y: 40,
        w: 14,
        ratio: 1,
        gradFrom: "#ff0000",
        gradTo: "#0000ff",
        gradAngle: 90,
        gradStart: 20,
        gradEnd: 80,
        strokeWidth: 0,
        opacity: 1,
      },
      "art-line": { x: 5, y: 80, w: 14, strokeWidth: 0.8, color: "#229922", opacity: 1 },
      "art-path": {
        x: 5,
        y: 110,
        w: 14,
        ratio: 1.5,
        fill: null,
        color: "#aa00aa",
        strokeWidth: 0.6,
        opacity: 1,
      },
    };
    input.cover.blocks.push(...buildCustomBlocks("brief", shapes, shapeStyles, slots));
    input.cover.customFieldIds.push(...shapes.map((shape) => shape.id));
    input.cv.elements.push(...structuredClone(shapes));
    Object.assign(input.cv.elementStyles, structuredClone(shapeStyles));
    input.cv.elements.push({ ...shapes[1], id: "art-circle-page2", page: 2 });
    input.cv.elementStyles["art-circle-page2"] = { ...shapeStyles["art-circle"], y: 180 };
  }
  if (kind === "shapes-paper") {
    input.cover.colors.bg = "#f4e9da";
    input.cv.design.paperColor = "#eaf2e5";
    input.letter.design.paperColor = "#e8f0f4";
  }
  return input;
}
export function briefCoverTypographyFixture(
  kind:
    | "typography"
    | "lists"
    | "long-list"
    | "tracking-zero"
    | "tracking-wide"
    | "line-single"
    | "line-double" = "typography",
): DossierAppSnapshot {
  const input = briefFixture();
  const name = input.cover.blocks.find((block) => block.id === "name")!;
  const contact = input.cover.blocks.find((block) => block.id === "kontakt")!;
  const attachments = input.cover.blocks.find((block) => block.id === "beilagen")!;
  if (kind === "typography") {
    name.lines = ["Éva Müller ä ö ü é è à – — ·"];
    Object.assign(name.style, {
      uppercase: true,
      tracking: 0.08,
      lineHeight: 1.7,
      size: 18,
      italic: true,
      underline: true,
    });
    contact.lines = [[{ t: "Kontakt mit Farbe", color: "#123456", weight: 700 }], "Zweite Zeile"];
    contact.style.lineHeight = 1.8;
  }
  if (kind === "lists" || kind === "long-list") {
    attachments.lines =
      kind === "long-list"
        ? Array.from({ length: 55 }, (_, index) => `Unterlage ${index + 1}: ä ö ü é è à`)
        : [
            "Beilage Eins",
            "",
            [{ t: "Beilage Zwei", color: "#123456", weight: 700 }],
            "Beilage Drei",
          ];
    attachments.style.list = "number";
    contact.style.list = "dash";
    input.cover.blocks.push({
      ...structuredClone(attachments),
      id: "extra-list",
      label: "Weitere Unterlagen",
      lines: ["Neue Liste Eins", "Neue Liste Zwei"],
    });
    input.letter.data.richTextHtml =
      '<div data-list="number">Letter list one</div><div data-list="number">Letter list two</div>' +
      '<div>Between lists.</div><div data-list="number">Second letter list one</div>' +
      '<table><tbody><tr><td><div data-list="number">Left cell one</div><div data-list="number">Left cell two</div></td>' +
      '<td><div data-list="number">Right cell one</div><div data-list="number">Right cell two</div></td></tr></tbody></table>';
  }
  if (kind.startsWith("tracking-")) {
    name.lines = ["Tracking Probe"];
    Object.assign(name.style, {
      size: 18,
      uppercase: false,
      tracking: kind === "tracking-wide" ? 0.3 : 0,
    });
  }
  if (kind.startsWith("line-")) {
    contact.lines = ["Line Probe One", "Line Probe Two"];
    Object.assign(contact.style, {
      size: 12,
      tracking: 0,
      lineHeight: kind === "line-double" ? 2 : 1,
    });
  }
  return input;
}
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
