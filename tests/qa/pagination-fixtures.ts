import type { CvData, CvLayoutSectionKey } from "../../src/components/cv/types";
import type { CvLayoutId } from "../../src/components/cv/layout";
import { defaultCvLayoutForTemplate } from "../../src/components/cv/layout";
import {
  defaultHeaderModeForTemplate,
  defaultFooterModeForTemplate,
} from "../../src/lib/template-chrome";
import { parityStorage } from "../e2e/support/cv-parity-fixture";

export type PaginationFixture = {
  storage: Record<string, string>;
  markers: { cv: string[]; letter: string[] };
  sequences: { cv: string[][]; letter: string[][] };
  segments: { cv: string[]; letter: string[] };
};
export type FixtureOptions = {
  works?: number;
  schools?: number;
  paragraphs?: number;
  layout?: CvLayoutId;
  mirrored?: boolean;
  largeEntry?: boolean;
  descriptionRepeats?: number;
  columns?: boolean;
  masonry?: boolean;
  custom?: boolean;
  longWord?: boolean;
};
const marker = (kind: string, i: number) => `QA${kind}${String(i + 1).padStart(3, "0")}`;
const workDescription =
  "Im Team entwickelte ich kleine Automatisierungen, unterstützte den Support und dokumentierte die Ergebnisse. Ich prüfte die Anforderungen mit den Fachpersonen, organisierte Rückmeldungen und präsentierte nachvollziehbare Lösungen.";
const paragraph =
  "In einem gemeinsamen Informatikprojekt plante ich die Arbeitsschritte, besprach Anforderungen und entwickelte eine verständliche Lösung. Dabei lernte ich, Rückmeldungen sorgfältig zu prüfen, Fehler systematisch zu suchen und meine Ergebnisse nachvollziehbar zu dokumentieren. Diese Erfahrung möchte ich in Ihr Team einbringen.";

/** Real persisted product inputs; pagination remains entirely in production components. */
export function paginationFixture(
  template: string,
  options: FixtureOptions = {},
): PaginationFixture {
  const storage: Record<string, string> = parityStorage(template);
  const cv = JSON.parse(storage["lebenslauf:v1"]);
  const letter = JSON.parse(storage["anschreiben:v1"]);
  const cover = JSON.parse(storage["titelblatt:v3"]);
  const data: CvData = cv.data;
  data.person.foto = options.custom ? data.person.foto : null;
  data.schule = Array.from({ length: options.schools ?? 2 }, (_, i) => ({
    id: `qa-school-${i}`,
    zeit: `${2025 - i} – ${2026 - i}`,
    titel: `${marker("SCHOOL", i)} Weiterbildung Informatik`,
    ort: "Bildungszentrum Solothurn",
    beschreibung: `${marker("EDU", i)} Projektarbeit, Mathematik und selbstständiges Lernen. ${marker("EDUEND", i)}`,
  }));
  data.erfahrung = Array.from({ length: options.works ?? 2 }, (_, i) => ({
    id: `qa-work-${i}`,
    zeit: `${2026 - i}`,
    titel: `${marker("WORK", i)} Informatik und Support`,
    ort: "Beispiel AG, Hubersdorf",
    beschreibung: `${marker("DESC", i)} ${workDescription.repeat(i === 0 ? (options.descriptionRepeats ?? 1) : 1)}${options.largeEntry && i === 2 ? `\n${Array.from({ length: 24 }, (_, j) => `• ${marker("BULLET", j)} ${workDescription}`).join("\n")}` : ""} ${marker("END", i)}`,
  }));
  data.referenzen[0].name = "QAREF001 Thomas Weber";
  data.customSections = [
    {
      id: "qa-projects",
      title: "Projekte",
      entries: [
        {
          id: "qa-project",
          zeit: "2026",
          titel: "QAPROJECT001 Lernplattform",
          ort: "Solothurn",
          beschreibung: "QAPROJECTEND001 Entwicklung und Evaluation im Team.",
        },
      ],
    },
  ];
  data.sectionOrder = [
    "person",
    "schule",
    "erfahrung",
    "sprachen",
    "hobbys",
    "staerken",
    "referenzen",
    "custom:qa-projects",
  ] as CvLayoutSectionKey[];
  if (options.columns || options.masonry)
    data.sectionLayouts = {
      schule: { width: "half", packing: options.masonry ? "masonry" : "rows" },
      erfahrung: { width: "half", packing: options.masonry ? "masonry" : "rows" },
      referenzen: { width: "half", packing: options.masonry ? "masonry" : "rows" },
      "custom:qa-projects": { width: "half", packing: options.masonry ? "masonry" : "rows" },
    };
  const cvSegments = [...data.schule, ...data.erfahrung, ...data.customSections[0].entries]
    .flatMap((e) => [e.titel, e.beschreibung])
    .filter(Boolean);
  const cvMarkers: string[] = cvSegments.join(" ").match(/QA[A-Z]+\d{3}/g) ?? [];
  cvMarkers.push("QAREF001");
  const bodies = Array.from(
    { length: options.paragraphs ?? 2 },
    (_, i) => `${marker("PARA", i)} ${paragraph} ${marker("PARAEND", i)}`,
  );
  if (options.longWord) bodies[1] += ` ${"Zusammenarbeit".repeat(35)} QALONGWORD001`;
  letter.data.text = bodies.join("\n\n");
  letter.data.richTextHtml = "";
  letter.data.anrede = "QASALUTATION001 Guten Tag Herr Weber";
  letter.data.gruss = "QACLOSING001 Freundliche Grüsse";
  letter.data.unterschrift = "QASIGNATURE001 Lea Müller";
  letter.data.beilagen = ["QAATTACHMENT001 Lebenslauf", "QAATTACHMENT002 Arbeitszeugnis"];
  letter.design.template = template;
  letter.design.headerMode = defaultHeaderModeForTemplate(template);
  letter.design.footerMode = defaultFooterModeForTemplate(template);
  cover.template = template;
  if (options.custom) {
    letter.design.bodyFontSizePt = 12;
    letter.design.bodyFont = "freundlich";
    storage["bewerbungsdossier:page-margins:v1"] = JSON.stringify({
      cv: { top: 24, right: 24, bottom: 1, left: 24 },
      letter: { top: 24, right: 24, bottom: 24, left: 24 },
    });
    storage["lebenslauf:section-gap:v1"] = "6";
    storage["lebenslauf:continuation-top-margin:v1"] = "18";
  }
  storage["lebenslauf:layout:v1"] = options.layout ?? defaultCvLayoutForTemplate(template);
  storage["lebenslauf:info-position:v1"] = options.mirrored ? "mirrored" : "standard";
  storage["lebenslauf:layout-mirror:v1"] = String(!!options.mirrored);
  storage["lebenslauf:v1"] = JSON.stringify(cv);
  storage["anschreiben:v1"] = JSON.stringify(letter);
  storage["titelblatt:v3"] = JSON.stringify(cover);
  const letterMarkers: string[] = bodies.join(" ").match(/QA[A-Z]+\d{3}/g) ?? [];
  letterMarkers.push(
    "QASALUTATION001",
    "QACLOSING001",
    "QASIGNATURE001",
    "QAATTACHMENT001",
    "QAATTACHMENT002",
  );
  return {
    storage,
    markers: { cv: cvMarkers, letter: letterMarkers },
    sequences: {
      cv: [
        data.schule.map((_, i) => marker("SCHOOL", i)),
        data.erfahrung.map((_, i) => marker("WORK", i)),
      ],
      letter: [bodies.map((_, i) => marker("PARA", i))],
    },
    segments: { cv: cvSegments, letter: bodies },
  };
}
