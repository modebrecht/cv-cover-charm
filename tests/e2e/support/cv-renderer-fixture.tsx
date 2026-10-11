import { createRoot, type Root } from "react-dom/client";
import { CvCanvas } from "../../../src/components/cv/CvCanvas";
import { emptyCv, type CvData } from "../../../src/components/cv/types";
import type { TemplateId } from "../../../src/components/cover/types";
import type { CvPresentation } from "../../../src/components/cv/presentation";
import { DEFAULT_DOSSIER_PHOTO_STYLE } from "../../../src/lib/dossier-photo";
import { DEFAULT_CV_PHOTO_PLACEMENT } from "../../../src/components/cv/photo-place";

export type FixtureCase = {
  id: string;
  template: TemplateId;
  presentation: Partial<CvPresentation>;
  long?: boolean;
  sidebarPct?: number;
};
let mounted: Root | undefined;

export function fixtureData(long = false): CvData {
  return {
    ...emptyCv,
    person: {
      ...emptyCv.person,
      vorname: "Lea",
      nachname: "Müller",
      untertitel: "Schülerin",
      foto:
        "data:image/svg+xml," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="100"><rect width="80" height="100" fill="#d0c0a0"/></svg>',
        ),
    },
    schule: [
      {
        id: "school",
        zeit: "2023 – heute",
        titel: "Sekundarschule",
        ort: "Hubersdorf",
        beschreibung: "Schwerpunkt Mathematik und Informatik",
      },
    ],
    erfahrung: Array.from({ length: long ? 18 : 1 }, (_, i) => ({
      id: `work-${i}`,
      zeit: "2026",
      titel: `Praxisstation ${i + 1}`,
      ort: "Beispiel AG",
      beschreibung:
        "Support und kleine Automatisierungen mit Python. Zusammenarbeit im Team und sorgfältige Dokumentation der Arbeitsschritte.",
    })),
    referenzen: [
      {
        id: "ref",
        name: "Referenzmarker",
        funktion: "Klassenlehrerin",
        kontakt: "079 123 45 67",
        email: "lea@example.ch",
        zusatz: "",
      },
    ],
  };
}

/** Test-only mount of the production renderer; no alternate rendering logic. */
export function mountCvFixtures(cases: FixtureCase[]) {
  const host =
    document.getElementById("cv-fixtures") ??
    document.body.appendChild(Object.assign(document.createElement("div"), { id: "cv-fixtures" }));
  mounted ??= createRoot(host);
  mounted.render(
    <>
      {cases.map((item) => (
        <div key={item.id} data-fixture={item.id}>
          <CvCanvas
            data={fixtureData(item.long)}
            design={{
              template: item.template,
              colors: {},
              bgOpacity: 0.25,
              useElements: false,
              sidebarPct: item.sidebarPct,
            }}
            elements={[]}
            exportMode
            manageGlobalTemplateScope={false}
            presentation={{
              sectionGapMm: null,
              continuationTopMarginMm: 10,
              pageMargins: null,
              bodyAlignment: "left",
              photoStyle: DEFAULT_DOSSIER_PHOTO_STYLE,
              photoPlacement: DEFAULT_CV_PHOTO_PLACEMENT,
              ...item.presentation,
            }}
          />
        </div>
      ))}
    </>,
  );
}
