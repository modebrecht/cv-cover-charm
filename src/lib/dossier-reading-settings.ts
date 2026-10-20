/** Shared physical/typographic policy. No browser state or renderer imports. */
export const DOSSIER_DEFAULT_CONTENT_TOP_MM = 20;
/** Visible header-to-content clearance shared by Letter/CV and every page.
 * The existing extra-gap control keeps its numeric, additive meaning: its
 * standard 12 mm plus 8 mm physical margin yield this 20 mm clearance. */
export const DOSSIER_HEADER_CONTENT_CLEARANCE_MM = 20;
export const DOSSIER_HEADER_EXTRA_GAP_MM = 12;
export function dossierDefaultContentTopMm(
  headerHeightMm: number,
  extraGapMm = DOSSIER_HEADER_EXTRA_GAP_MM,
  structuralTopMm = 0,
): number {
  return (
    Math.ceil(
      Math.max(
        structuralTopMm,
        headerHeightMm > 0
          ? headerHeightMm +
              DOSSIER_HEADER_CONTENT_CLEARANCE_MM +
              Math.min(40, Math.max(0, extraGapMm)) -
              DOSSIER_HEADER_EXTRA_GAP_MM
          : DOSSIER_DEFAULT_CONTENT_TOP_MM,
      ) * 2,
    ) / 2
  );
}
export const DOSSIER_CONTINUATION_TOP_MM = DOSSIER_DEFAULT_CONTENT_TOP_MM;
export const DOSSIER_CONTINUATION_TOP_MIN_MM = 0;
export const DOSSIER_CONTINUATION_TOP_MAX_MM = 120;
export const DOSSIER_CV_RUBRIC_PX = 14;
export const DOSSIER_LETTER_BODY_PT = 10.5;
/** Minimum visible clearance, independently of the first-page header-gap control. */
export const DOSSIER_CONTINUATION_HEADER_CLEARANCE_MM = 4;

export function normalizeDossierContinuationTopMm(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.max(0, Math.min(DOSSIER_CONTINUATION_TOP_MAX_MM, Math.round(numeric * 2) / 2))
    : undefined;
}

/** Authored start wins unless visible chrome or a structural frame needs protection.
 * Round safety upwards to the persisted half-mm grid. Hidden headers own no gap. */
export function dossierContinuationContentTopMm(
  requestedTopMm: number,
  headerHeightMm: number,
  structuralTopMm = 0,
  clearanceMm = DOSSIER_CONTINUATION_HEADER_CLEARANCE_MM,
): number {
  if (![requestedTopMm, headerHeightMm, structuralTopMm, clearanceMm].every(Number.isFinite))
    throw Error("Ungültige Geometrie für den Folgeseitenrand.");
  return (
    Math.ceil(
      Math.max(
        0,
        requestedTopMm,
        structuralTopMm,
        headerHeightMm > 0 ? headerHeightMm + clearanceMm : 0,
      ) * 2,
    ) / 2
  );
}

/** Existing Sidebar and its legacy alias are frozen, regardless of template name. */
export const frozenCvReadingLayout = (layout: string) =>
  layout === "modern" || layout === "executive" || layout === "sidebar";
