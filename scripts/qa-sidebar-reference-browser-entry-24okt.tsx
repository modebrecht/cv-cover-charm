/** QA-only current DossierPdfCanvas + normal PDF export; synthetic references only. */
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { DossierPdfCanvas } from "../src/components/dossier/DossierPdfCanvas";
import { DEMO_DATA, DEFAULT_COVER_BEILAGEN } from "../src/components/cover/types";
import { DEFAULTS } from "../src/default-config";
import { DEMO_LETTER, emptyLetterDesign } from "../src/components/letter/types";
import {
  coverPdfDocumentFromSaved,
  letterPdfDocumentFromSaved,
  cvPdfDocumentFromSaved,
  type CvPdfDocument,
} from "../src/lib/dossier-pdf-document";
import type { PortableCvState } from "../src/components/cv/portable-state";
import { storeDossierProject, type DossierProject } from "../src/lib/dossier-project";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../src/lib/dossier-chrome";
import { DEFAULT_CV_PLACEMENTS, DEMO_CV } from "../src/components/cv/types";
import { downloadCombinedDossierPdf } from "../src/lib/dossier-pdf";
import { inspectPdfPreflight } from "../src/lib/pdf-preflight";
import "../src/styles.css";

const query = new URLSearchParams(location.search);
const side = query.get("side") === "right" ? "right" : "left";
const half = query.get("half") === "true";
const cvSource: CvPdfDocument & { portableState?: PortableCvState } = {
  data: structuredClone(DEMO_CV),
  design: { template: "modern", colors: {}, font: "sans", bgOpacity: 0.06, useElements: false },
  elements: [],
  elementStyles: {},
};
cvSource.data.person.foto = "";
cvSource.data.referenzen = [
  {
    id: "email-only",
    name: "",
    funktion: "",
    kontakt: "",
    email: "alpha@example.invalid",
    zusatz: "",
  },
  {
    id: "extra-only",
    name: "",
    funktion: "",
    kontakt: "",
    email: "",
    zusatz: "Nur nach Vereinbarung",
  },
  {
    id: "separate",
    name: "Referenzperson",
    funktion: "",
    kontakt: "",
    email: "beta@example.invalid",
    zusatz: "Bitte zuerst anfragen",
  },
  {
    id: "legacy",
    name: "",
    funktion: "",
    kontakt: "000 000 00 00\ngamma@example.invalid\nAlte Zusatzzeile",
    email: "gamma@example.invalid",
    zusatz: "Alte Zusatzzeile",
  },
];
cvSource.portableState = {
  layout: "modern",
  infoPosition: side === "right" ? "mirrored" : "standard",
  mirrored: side === "right",
  placements: { ...DEFAULT_CV_PLACEMENTS, referenzen: half ? "main" : "side" },
};
if (half) cvSource.data.sectionLayouts = { referenzen: { width: "half", page: 1 } };
const project: DossierProject = {
  kind: "cv-cover-charm-dossier",
  version: 1,
  savedAt: "2026-10-24T00:00:00.000Z",
  cover: {
    version: 9,
    template: "modern",
    data: {
      ...structuredClone(DEMO_DATA),
      kicker: DEFAULTS.KICKER,
      showBetriebOnCover: false,
      showBeilagenOnCover: true,
      beilagen: [...DEFAULT_COVER_BEILAGEN],
      foto: null,
    },
    colors: { modern: {} },
    layout: { modern: {} },
    fontScale: 1,
  },
  letter: {
    data: structuredClone(DEMO_LETTER),
    design: { ...emptyLetterDesign(), template: "modern", font: "sans" },
  },
  cv: cvSource,
  chrome: structuredClone(DEFAULT_DOSSIER_CHROME_STATE),
};
const input = JSON.stringify(project);
storeDossierProject(project);
const cover = coverPdfDocumentFromSaved(project.cover);
const letter = letterPdfDocumentFromSaved(project.letter);
const cv = cvPdfDocumentFromSaved(project.cv);
const root = document.getElementById("root")!;
createRoot(root).render(
  createElement(DossierPdfCanvas, { cover, letter, cv, chromeState: project.chrome }),
);

Object.assign(window, {
  referenceQa: {
    side,
    half,
    inputUnchanged: () => JSON.stringify(project) === input,
    preflight: () =>
      inspectPdfPreflight(
        document.querySelector<HTMLElement>("[data-dossier-pdf-canvas]")!,
        "dossier",
      ),
    download: () =>
      downloadCombinedDossierPdf(
        document.querySelector<HTMLElement>("[data-dossier-pdf-canvas]")!,
        `references-${side}-${half ? "half-main" : "sidebar"}.pdf`,
        { title: "Synthetische CV-Referenzpruefung", author: "CV Cover Charm QA" },
      ),
  },
});
