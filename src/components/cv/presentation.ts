import {
  getCvDocumentTitleMarginTopPx,
  subscribeCvDocumentTitleMarginTop,
  CV_DOC_TITLE_MARGIN_TOP_DEFAULT_PX,
} from "@/lib/cv-document-title-spacing";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  getDossierPageMarginsSnapshot,
  normalizeDossierPageMarginsState,
  subscribeDossierPageMargins,
  type DossierPageMargins,
} from "@/lib/dossier-page-margins";
import { DEFAULT_DOSSIER_PHOTO_STYLE, type DossierPhotoStyle } from "@/lib/dossier-photo";
import {
  defaultCvLayoutForTemplate,
  getCvContinuationTopMarginOverrideMm,
  getCvInfoPosition,
  getCvLayoutChoiceForTemplate,
  getCvSectionGapMm,
  subscribeCvLayout,
  type CvInfoPosition,
  type CvLayoutId,
} from "./layout";
import { getCvPhotoStyle, subscribeCvPhotoStyle } from "./photo";
import {
  DEFAULT_CV_PHOTO_PLACEMENT,
  getCvPhotoPlacement,
  subscribeCvPhotoPlacement,
  type CvPhotoPlacement,
} from "./photo-place";
import { getCvPlacements, subscribeCvPlacements } from "./placement";
import { getCvTextAlignment, subscribeCvTextAlignment } from "./text-alignment";
import { DEFAULT_CV_PLACEMENTS, type CvPlacements } from "./types";

/** Complete presentation snapshot shared by measurement, preview and export. */
export type CvPresentation = {
  layoutChoice: CvLayoutId;
  infoPosition: CvInfoPosition;
  photoStyle: DossierPhotoStyle;
  photoPlacement: CvPhotoPlacement;
  placements: CvPlacements;
  sectionGapMm: number | null;
  documentTitleMarginTopPx: number;
  continuationTopMarginMm: number | null;
  pageMargins: DossierPageMargins | null;
  bodyAlignment: ReturnType<typeof getCvTextAlignment>;
};

/** The editor store is an adapter; explicit instance props take precedence. */
export function useCvPresentation(
  template: string,
  overrides?: Partial<CvPresentation>,
): CvPresentation {
  const getChoice = useCallback(() => getCvLayoutChoiceForTemplate(template), [template]);
  const layoutChoice = useSyncExternalStore(subscribeCvLayout, getChoice, () =>
    defaultCvLayoutForTemplate(template),
  );
  const infoPosition = useSyncExternalStore(
    subscribeCvLayout,
    getCvInfoPosition,
    () => "standard" as const,
  );
  const sectionGapMm = useSyncExternalStore(subscribeCvLayout, getCvSectionGapMm, () => null);
  const getContinuation = getCvContinuationTopMarginOverrideMm;
  const continuationTopMarginMm = useSyncExternalStore(
    subscribeCvLayout,
    getContinuation,
    () => null,
  );
  const photoStyle = useSyncExternalStore(
    subscribeCvPhotoStyle,
    getCvPhotoStyle,
    () => DEFAULT_DOSSIER_PHOTO_STYLE,
  );
  const photoPlacement = useSyncExternalStore(
    subscribeCvPhotoPlacement,
    getCvPhotoPlacement,
    () => DEFAULT_CV_PHOTO_PLACEMENT,
  );
  const placements = useSyncExternalStore(
    subscribeCvPlacements,
    getCvPlacements,
    () => DEFAULT_CV_PLACEMENTS,
  );
  const bodyAlignment = useSyncExternalStore(
    subscribeCvTextAlignment,
    getCvTextAlignment,
    () => "left" as const,
  );
  const margins = useSyncExternalStore(
    subscribeDossierPageMargins,
    getDossierPageMarginsSnapshot,
    () => "{}",
  );
  const documentTitleMarginTopPx = useSyncExternalStore(
    subscribeCvDocumentTitleMarginTop,
    getCvDocumentTitleMarginTopPx,
    () => CV_DOC_TITLE_MARGIN_TOP_DEFAULT_PX,
  );
  const pageMargins = useMemo(() => {
    try {
      return normalizeDossierPageMarginsState(JSON.parse(margins)).cv ?? null;
    } catch {
      return null;
    }
  }, [margins]);
  return useMemo(() => {
    const snapshot = {
      layoutChoice,
      infoPosition,
      sectionGapMm,
      documentTitleMarginTopPx,
      continuationTopMarginMm,
      photoStyle,
      photoPlacement,
      placements,
      bodyAlignment,
      pageMargins,
      ...overrides,
    };
    return {
      ...snapshot,
      layoutChoice: snapshot.layoutChoice === "executive" ? "modern" : snapshot.layoutChoice,
    };
  }, [
    layoutChoice,
    infoPosition,
    sectionGapMm,
    documentTitleMarginTopPx,
    continuationTopMarginMm,
    photoStyle,
    photoPlacement,
    placements,
    bodyAlignment,
    pageMargins,
    overrides,
  ]);
}

/** Set defaults explicitly so unrelated root crop/gap values cannot be inherited. */
export function cvPresentationCssVariables({
  photoStyle: photo,
  photoPlacement,
  sectionGapMm,
  documentTitleMarginTopPx,
}: CvPresentation): Record<`--cv-${string}`, string> {
  return {
    "--cv-photo-zoom": String(photo.zoom),
    "--cv-photo-width": `${photo.zoom * 100}%`,
    "--cv-photo-height": `${photo.zoom * 100}%`,
    "--cv-photo-left": `${-(photo.zoom - 1) * photo.x}%`,
    "--cv-photo-top": `${-(photo.zoom - 1) * photo.y}%`,
    "--cv-photo-border-width": `${photo.borderWidth}mm`,
    "--cv-photo-border-color": photoPlacement.frameColor ?? "currentColor",
    "--cv-doc-title-margin-top": `${documentTitleMarginTopPx}px`,
    "--cv-section-gap": sectionGapMm === null ? "initial" : `${sectionGapMm}mm`,
  };
}
