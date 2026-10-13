/** Font-policy acceptance fixtures; no production palette, geometry or JSON migration changes. */
import "../../../src/components/cover/fresh-templates";
import { TEMPLATES, FONT_LABELS, type FontKey } from "../../../src/components/cover/types";
import { coverPdfDocumentFromSaved } from "../../../src/lib/dossier-pdf-document";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../../src/lib/dossier-chrome";
import { WORD_FONTS } from "../../../src/lib/docx-next/fonts";
import { cvEntryFieldId } from "../../../src/lib/dossier-semantic-fields";
import { briefFixture } from "./brief";

export const MATRIX_KEYS = Object.keys(FONT_LABELS) as FontKey[];
export const MATRIX_ALTERNATIVES = [...new Set(Object.values(WORD_FONTS).map((f) => f.fallback))];
export const MATRIX_PRIMARY = [...new Set(Object.values(WORD_FONTS).map((f) => f.font))];
export const MATRIX_CASES = [
  "default",
  "default-fallback",
  ...MATRIX_KEYS.map((key) => `selected-${key}`),
  ...MATRIX_KEYS.map((key) => `fallback-${key}`),
  "mixed",
  "mixed-fallback",
  "long-cv",
  "long-cv-fallback",
  "long-letter",
  "long-letter-fallback",
  "sidebar-left",
  "sidebar-left-fallback",
  "sidebar-right",
  "sidebar-right-fallback",
];

export function fontMatrixFixture(templateId: string, scenario: string) {
  const definition = TEMPLATES.find((t) => t.id === templateId);
  if (!definition || !MATRIX_CASES.includes(scenario)) throw new Error("Unknown font matrix case");
  const input = briefFixture("normal");
  const colors = Object.fromEntries(definition.slots.map((s) => [s.key, s.default]));
  input.cover = coverPdfDocumentFromSaved({
    template: definition.id,
    data: input.cover.data,
    colors,
    fontScale: 1,
  })!;
  input.cover.data.foto = "";
  input.cv.data.person.foto = "";
  input.letter.data.images = [];
  input.cv.design.template = definition.id;
  input.letter.design.template = definition.id;
  input.cv.design.colors = { ...colors };
  input.letter.design.colors = { ...colors };
  input.cv.design.font = undefined;
  input.letter.design.fontOverride = undefined;
  input.settings.fontPolicy = { embedding: "disabled" };
  const key = MATRIX_KEYS.find((k) => scenario === `selected-${k}` || scenario === `fallback-${k}`);
  if (key || scenario.startsWith("long-") || scenario.startsWith("sidebar-")) {
    input.cv.design.font = key ?? "freundlich";
    input.letter.design.font = key ?? "freundlich";
    input.letter.design.fontOverride = key ?? "freundlich";
  }
  if (key) input.settings.fieldStyles = { "cover.fullName": { font: WORD_FONTS[key].font } };
  if (scenario.startsWith("selected-"))
    input.settings.fontPolicy.availableFonts = [...MATRIX_PRIMARY, ...MATRIX_ALTERNATIVES];
  if (scenario.startsWith("fallback-") || scenario.endsWith("-fallback"))
    input.settings.fontPolicy.availableFonts = [...MATRIX_ALTERNATIVES];

  input.letter.data.richTextHtml =
    "<p>Normalprobe ä ö ü Ä Ö Ü é è à ç ñ ß.</p>" +
    "<p><strong>Fettprobe Zürich</strong> <em>Kursivprobe Genève</em> " +
    "<strong><em>Mischprobe François</em></strong> <u>Unterstrichen München</u></p>" +
    "<table><tbody><tr><td>Zellenprobe café</td><td><em>Zellkursiv crème</em></td></tr></tbody></table>";
  input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
  Object.assign(input.settings.chrome.shared, {
    headerMode: "contact",
    headerDifferentFirstPage: true,
    headerContinuationMode: "compact",
    footerMode: "details",
  });
  for (const [scope, part] of [
    ["letter", input.letter],
    ["cv", input.cv],
  ] as const)
    part.design.chromeContent = {
      headerTitleEnabled: true,
      headerTitle: `${scope} Kopfprobe Äé`,
      headerTextEnabled: true,
      headerText: `${scope} Kopftext àç`,
      footerTitleEnabled: true,
      footerTitle: `${scope} Fussprobe Öè`,
      footerTextEnabled: true,
      footerText: `${scope} Fusstext üñ`,
    };
  if (scenario.startsWith("mixed")) {
    input.cv.design.font = "freundlich";
    input.letter.design.font = "humanist";
    input.letter.design.fontOverride = "humanist";
    input.letter.design.bodyFont = "times";
    input.settings.chrome.shared.textFont = "maschine";
    input.settings.fieldStyles = {
      "letter.subject": { font: "Georgia", bold: true },
      "letter.header.title": { font: "Georgia", italic: true },
      "cv.footer.title": { font: "Courier New", bold: true, italic: true },
    };
    input.cv.data.schule = MATRIX_KEYS.map((fontKey) => ({
      id: `font-${fontKey}`,
      zeit: "2024–2026",
      titel: `Fontprobe ${fontKey} Äé`,
      ort: "Zürich",
      beschreibung: `Fonttext ${fontKey} àç üñ`,
    }));
    for (const fontKey of MATRIX_KEYS) {
      input.settings.fieldStyles[cvEntryFieldId("schule", `font-${fontKey}`, "title")] = {
        font: WORD_FONTS[fontKey].font,
        bold: true,
        italic: true,
      };
      input.settings.fieldStyles[cvEntryFieldId("schule", `font-${fontKey}`, "description")] = {
        font: WORD_FONTS[fontKey].font,
      };
    }
  }
  if (scenario.startsWith("long-letter"))
    input.letter.data.richTextHtml = Array.from(
      { length: 24 },
      (_, i) =>
        `<p>Briefabschnitt ${i + 1}: Äpfel, Zürich und Genève. ` +
        "Sorgfältige editierbare Bewerbungsinhalte behalten ihre Schrift und Formatierung. ".repeat(
          3,
        ) +
        `Endeabschnitt ${i + 1}.</p>`,
    ).join("");
  if (scenario.startsWith("long-cv"))
    input.cv.data.schule = Array.from({ length: 24 }, (_, i) => ({
      id: `lang-${i}`,
      zeit: "2024–2026",
      titel: `Lebenslaufstation ${i + 1} Äé`,
      ort: "Zürich",
      beschreibung:
        `Stationsinhalt ${i + 1}: ` +
        "Sorgfältige Arbeit mit café, crème und François in editierbaren Unterlagen. ".repeat(3),
    }));
  if (scenario.startsWith("sidebar-")) {
    input.settings.cvLayout = "sidebar";
    input.settings.sidebarSide = scenario.startsWith("sidebar-left") ? "left" : "right";
    // Existing supported parallel-flow composition excludes running CV headers.
    input.settings.chrome.cv = {
      ...input.settings.chrome.shared,
      headerMode: "none",
      headerContinuationMode: "none",
      footerMode: "none",
    };
  }
  return input;
}
