import { briefFixture } from "./brief";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../../src/lib/dossier-chrome";

export const SIDEBAR_FIXTURES = [
  "left",
  "right",
  "minimal",
  "narrow",
  "wide",
  "main-long",
  "side-long",
  "both-long",
  "paragraph-long",
  "side-paragraph-long",
  "photo-left",
  "photo-right",
  "photo-main",
  "placements",
  "styled",
  "hidden-paint",
] as const;
export type SidebarFixture =
  | (typeof SIDEBAR_FIXTURES)[number]
  | "contact"
  | "chrome-continuation"
  | "continuation";

export function sidebarFixture(kind: SidebarFixture = "left", image?: string) {
  const input = briefFixture(
    kind === "main-long" ||
      kind === "both-long" ||
      kind === "continuation" ||
      kind === "chrome-continuation"
      ? "long-cv"
      : kind === "minimal"
        ? "minimal"
        : "normal",
  );
  input.settings.cvLayout = "sidebar";
  input.settings.sidebarSide = kind === "right" || kind === "photo-right" ? "right" : "left";
  input.cv.design.sidebarPct = kind === "narrow" ? 0.22 : kind === "wide" ? 0.42 : 0.3;
  if (kind === "side-long" || kind === "both-long")
    input.cv.data.hobbys = Array.from(
      { length: 55 },
      (_, index) =>
        `Interesse ${index + 1}: Fotografie, Technik und gemeinsame Projekte mit klaren Aufgaben und eigener Verantwortung.`,
    );
  if (kind === "paragraph-long" || kind === "side-paragraph-long") {
    input.cv.data.customSections = [
      {
        id: "long-paragraph",
        title: "Langtext-Projekt",
        entries: [
          {
            id: "long-paragraph-entry",
            zeit: "2024–2026",
            titel: "Mehrseitige Beschreibung",
            ort: "Zürich",
            beschreibung:
              "Eine native editierbare Beschreibung fließt ohne Kürzung über mehrere Seiten und behält ihre semantische Identität. ".repeat(
                180,
              ) + " Sichtbarer Langtext-Abschluss.",
          },
        ],
      },
    ];
    if (kind === "side-paragraph-long")
      input.settings.placements = { "custom:long-paragraph": "side" };
  }
  if (kind.startsWith("photo")) {
    input.cv.data.person.foto = image ?? "sidebar-photo";
    input.settings.cvPhotoPlacement = {
      mode: kind === "photo-main" ? "right" : "auto",
      widthMm: 34,
      xMm: 150,
      yMm: 20,
    };
    input.settings.cvPhotoStyle = { shape: "circle", zoom: 1.25, x: 42, y: 58, borderWidth: 0.4 };
  }
  if (kind === "placements") {
    input.settings.placements = { kontakt: "main", schule: "side", hobbys: "main" };
    input.cv.data.customSections = [
      {
        id: "sidebar-custom",
        title: "Eigene Projekte",
        entries: [
          {
            id: "sidebar-custom-entry",
            zeit: "2026",
            titel: "Native Komposition",
            ort: "Bern",
            beschreibung: "Eigene Rubriken behalten ihre gespeicherte Zuordnung.",
          },
        ],
      },
    ];
    input.settings.placements["custom:sidebar-custom"] = "side";
  }
  if (kind === "styled")
    input.settings.fieldStyles = {
      "cv.person.firstName": { color: "9B2349", italic: true, sizePt: 19 },
      "cv.section.hobbys.heading": { color: "246138", bold: true, sizePt: 13 },
    };
  if (kind === "contact" || kind === "chrome-continuation") {
    input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
    Object.assign(input.settings.chrome.shared, {
      headerMode: "contact",
      headerHeightMm: 32,
      headerGapMm: 4,
    });
  }
  if (kind === "chrome-continuation")
    Object.assign(input.settings.chrome!.shared, {
      headerDifferentFirstPage: true,
      headerContinuationMode: "compact",
    });
  if (kind === "continuation") input.settings.cvContinuationTopMarginMm = 10;
  if (kind === "hidden-paint") input.cv.design.bgOpacity = 0;
  return input;
}
