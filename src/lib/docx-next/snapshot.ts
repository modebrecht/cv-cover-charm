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
  getCvContinuationTopMarginOverrideMm,
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
import { cvSectionTitleFontSizePx } from "@/components/cv/reading-defaults";
import { cvContentBox, cvFrameFor } from "@/components/cv/archetype";
import { letterPageGeometry } from "@/components/letter/layout-system";
import { resolveDossierChromeSnapshot } from "@/lib/dossier-resolved-chrome";
import { frozenCvReadingLayout } from "@/lib/dossier-reading-settings";

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
  const layoutChoice = getCvLayoutChoiceForTemplate(cv.design.template);
  const source = toDossierSource(cover, letter, cv);
  const sectionSize = cvSectionTitleFontSizePx(cv.design, layoutChoice);
  // Resolve the same Web default before metric keys are captured. A packet
  // measured against the former implicit size must not match this source.
  if (!frozenCvReadingLayout(layoutChoice) && sectionSize !== undefined)
    source.cv.design = { ...source.cv.design, sectionTitleFontSizePx: sectionSize };
  const chrome = getDossierChromeState();
  const margins = getDossierPageMarginsState();
  const resolvedChrome = resolveDossierChromeSnapshot(source, chrome);
  const continuationTopMarginMm = frozenCvReadingLayout(layoutChoice)
    ? getCvContinuationTopMarginMm(cv.design.template, layoutChoice)
    : getCvContinuationTopMarginOverrideMm();
  const letterTops = [0, 1].map(
    (pageIndex) =>
      letterPageGeometry(letter.data, letter.design, {
        pageIndex,
        chromeOptions: resolvedChrome.letter.options,
        pageMargins: margins.letter ?? null,
      }).content.top,
  );
  const cvTops = frozenCvReadingLayout(layoutChoice)
    ? undefined
    : [0, 1].map(
        (pageIndex) =>
          cvContentBox(
            cvFrameFor(cv.design.template),
            pageIndex,
            "classic",
            cv.design.sidebarPct,
            resolvedChrome.cv.options,
            { pageMargins: margins.cv ?? null, continuationTopMarginMm },
          ).top,
      );
  return structuredClone({
    ...source,
    settings: {
      chrome,
      margins,
      flowPageTops: {
        letter: { firstMm: letterTops[0], continuationMm: letterTops[1] },
        ...(cvTops ? { cv: { firstMm: cvTops[0], continuationMm: cvTops[1] } } : {}),
      },
      cvLayout: cvWordLayout(layoutChoice),
      sidebarSide: getCvInfoPosition() === "mirrored" ? "right" : "left",
      placements: getCvPlacements(),
      cvAlignment: getCvTextAlignment(),
      cvSectionGapMm: getCvSectionGapMm(),
      cvContinuationTopMarginMm: continuationTopMarginMm ?? undefined,
      cvPhotoStyle: getCvPhotoStyle(),
      cvPhotoPlacement: getCvPhotoPlacement(),
      fieldStyles,
      unresolvedTypography,
    },
  });
}
