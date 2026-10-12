import fixture from "./cv-parity-data";
import type { CvData } from "../../../src/components/cv/types";

export const SELECTION_TARGETS = [
  "Sekundarschule, Niveau A",
  "Schwerpunkt Mathematik und Informatik",
  "Schnupperlehre Informatik",
];
export function parityStorage(template: string, long = false, sidebar = false) {
  const cv = structuredClone(fixture.cv) as CvData;
  cv.person.foto =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="100"><rect width="80" height="100" fill="#d0c0a0"/></svg>',
    );
  cv.schule[0].beschreibung = SELECTION_TARGETS[1];
  cv.erfahrung[0].titel = SELECTION_TARGETS[2];
  if (long)
    cv.erfahrung = Array.from({ length: 18 }, (_, i) => ({
      id: `long-${i}`,
      zeit: "2026",
      titel: `Praxisstation ${String(i + 1).padStart(2, "0")}`,
      ort: "Beispiel AG, Hubersdorf",
      beschreibung:
        "Support und kleine Automatisierungen mit Python. Zusammenarbeit im Team und sorgfältige Dokumentation der Arbeitsschritte. Selbstständige Vorbereitung und Präsentation der Ergebnisse.",
    }));
  cv.referenzen[0].name = "Referenzmarker";
  return {
    "titelblatt:v3": JSON.stringify({
      version: 7,
      template: "brief",
      data: fixture.cover,
      colors: {},
      layout: {},
      customs: [],
      fontScale: 1.2,
    }),
    "anschreiben:v1": JSON.stringify({
      version: 1,
      data: fixture.letter,
      design: fixture.letterDesign,
    }),
    "lebenslauf:v1": JSON.stringify({
      version: 6,
      data: cv,
      design: {
        template,
        colors: { primary: "#183046", accent: "#d99a42", ink: "#15212c", bg: "#ffffff" },
        bgOpacity: 0.25,
        useElements: false,
        sidebarPct: 22,
      },
      elements: [],
      elementStyles: {},
    }),
    "lebenslauf:layout:v1": sidebar ? "modern" : "classic",
    "lebenslauf:info-position:v1": sidebar ? "mirrored" : "standard",
    "lebenslauf:photo:v2": JSON.stringify({
      shape: "circle",
      zoom: 1.2,
      x: 35,
      y: 65,
      borderWidth: 0.3,
    }),
    "lebenslauf:photo-place:v1": JSON.stringify({
      mode: "frei",
      xMm: 150,
      yMm: 24,
      widthMm: 28,
      frameColor: null,
    }),
    "lebenslauf:placement:v1": JSON.stringify({
      kontakt: "side",
      schule: "main",
      erfahrung: "main",
      sprachen: "side",
      hobbys: "side",
      staerken: "side",
      referenzen: "main",
    }),
  };
}
