import type {
  CoverPdfDocument,
  CvPdfDocument,
  LetterPdfDocument,
} from "@/lib/dossier-pdf-document";
import { getDossierChromeState } from "@/lib/dossier-chrome";
import { getDossierPageMarginsState } from "@/lib/dossier-page-margins";
import {
  getCvLayoutChoiceForTemplate,
  getCvInfoPosition,
  getCvSectionGapMm,
  getCvContinuationTopMarginMm,
} from "@/components/cv/layout";
import { getCvPlacements } from "@/components/cv/placement";
import { getCvTextAlignment } from "@/components/cv/text-alignment";
import { getCvPhotoStyle } from "@/components/cv/photo";
import { getCvPhotoPlacement } from "@/components/cv/photo-place";
import { readPortableDossierFieldTypographyState } from "@/lib/dossier-field-typography";
import type { DossierAppSnapshot } from "./source";
import { toDossierSource } from "./source-adapter";
import { bindSavedTypography } from "./typography-bindings";
import { cvWordLayout } from "./layouts";

/** Capture ambient state once. Old anonymous field IDs require explicit semantic bindings. */
export function captureDossierDocxNextSnapshot(
  cover: CoverPdfDocument,
  letter: LetterPdfDocument,
  cv: CvPdfDocument,
  bindings: Record<string, string> = {},
): DossierAppSnapshot {
  const typography = readPortableDossierFieldTypographyState() ?? {
    version: 1,
    cv: {},
    letter: {},
  };
  const { fieldStyles, unresolvedTypography } = bindSavedTypography(typography, bindings);
  return structuredClone({
    ...toDossierSource(cover, letter, cv),
    settings: {
      chrome: getDossierChromeState(),
      margins: getDossierPageMarginsState(),
      cvLayout: cvWordLayout(getCvLayoutChoiceForTemplate(cv.design.template)),
      sidebarSide: getCvInfoPosition() === "mirrored" ? "right" : "left",
      placements: getCvPlacements(),
      cvAlignment: getCvTextAlignment(),
      cvSectionGapMm: getCvSectionGapMm(),
      cvContinuationTopMarginMm: getCvContinuationTopMarginMm(),
      cvPhotoStyle: getCvPhotoStyle(),
      cvPhotoPlacement: getCvPhotoPlacement(),
      fieldStyles,
      unresolvedTypography,
    },
  });
}
