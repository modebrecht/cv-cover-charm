import type {
  CoverPdfDocument,
  CvPdfDocument,
  LetterPdfDocument,
} from "@/lib/dossier-pdf-document";
import { getDossierChromeState } from "@/lib/dossier-chrome";
import { getDossierPageMarginsState } from "@/lib/dossier-page-margins";
import { getCvLayoutChoiceForTemplate, getCvInfoPosition } from "@/components/cv/layout";
import { getCvPlacements } from "@/components/cv/placement";
import { getCvTextAlignment } from "@/components/cv/text-alignment";
import { readPortableDossierFieldTypographyState } from "@/lib/dossier-field-typography";
import type { DossierAppSnapshot } from "./build-model";
import type { TextStyle } from "./model";

/** Capture ambient state once. Old anonymous field IDs require explicit semantic bindings. */
export function captureDossierDocxNextSnapshot(
  cover: CoverPdfDocument,
  letter: LetterPdfDocument,
  cv: CvPdfDocument,
  bindings: Record<string, string> = {},
): DossierAppSnapshot {
  const typography = readPortableDossierFieldTypographyState() ?? { cv: {}, letter: {} };
  const fieldStyles: Record<string, Partial<TextStyle>> = {};
  const unresolvedTypography: string[] = [];
  for (const [scope, bucket] of [
    ["cv", typography.cv],
    ["letter", typography.letter],
  ] as const) {
    for (const [key, entry] of Object.entries(bucket)) {
      const sourceId = entry.fieldId ?? key;
      const semanticId =
        bindings[sourceId] ?? (sourceId.startsWith(`${scope}.`) ? sourceId : undefined);
      if (semanticId) fieldStyles[semanticId] = { ...entry.style };
      else unresolvedTypography.push(sourceId);
    }
  }
  return structuredClone({
    cover,
    letter,
    cv,
    settings: {
      chrome: getDossierChromeState(),
      margins: getDossierPageMarginsState(),
      cvLayout:
        getCvLayoutChoiceForTemplate(cv.design.template) === "modern" ? "sidebar" : "classic",
      sidebarSide: getCvInfoPosition() === "mirrored" ? "right" : "left",
      placements: getCvPlacements(),
      cvAlignment: getCvTextAlignment(),
      fieldStyles,
      unresolvedTypography,
    },
  });
}
