/** Actionable export limits may be shown by the ordinary download interface. */
export class DocxDownloadError extends Error {}

export const CV_EXPLICIT_SECOND_PAGE_ERROR =
  "Fest auf Seite 2 zugewiesene CV-Rubriken sind im Word-Download noch nicht unterstützt. Bitte verwende den PDF-Download.";

export const CV_TWO_PAGE_PREVIEW_ERROR =
  "Die zwei CV-Seiten konnten für diese Word-Vorschau nicht sicher aufgeteilt werden. Bitte verwende den PDF-Download.";
