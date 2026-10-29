import { letterReadiness } from "@/components/letter/preflight";
import {
  coverPdfDocumentFromSaved,
  coverPdfHasContent,
  cvPdfDocumentFromSaved,
  cvPdfHasContent,
  letterPdfDocumentFromSaved,
} from "@/lib/dossier-pdf-document";
import {
  COVER_STORAGE_KEY,
  CV_STORAGE_KEY,
  LETTER_STORAGE_KEY,
  readStoredDossierPart,
} from "@/lib/dossier-project";
import { resolveDossierChromeSnapshot } from "@/lib/dossier-resolved-chrome";
import { DEFAULT_DOSSIER_CHROME_STATE } from "@/lib/dossier-chrome";
import { captureDossierDocxNextSnapshot } from "./snapshot";
import type { DossierAppSnapshot } from "./source";
import { DocxDownloadError } from "./download-error";
import { sourceLetterFlowInputIssue } from "./letter-source-flow";
import type { DocumentPart } from "./model";

export { DocxDownloadError } from "./download-error";

/** Keep implementation diagnostics out of the ordinary download interface. */
export function docxDownloadErrorMessage(error: unknown): string {
  return error instanceof DocxDownloadError
    ? error.message
    : "Die DOCX-Datei konnte mit diesen Einstellungen nicht erstellt werden. Bitte prüfe dein Dossier.";
}

/** The reviewed application composition, independently of the older URL-only trials. */
export function assertAppDocxNextSource(
  source: DossierAppSnapshot,
  part?: DocumentPart["id"],
): void {
  const cvOnly = part === "cv";
  if (
    (!cvOnly &&
      (source.cover.template !== "modern" || source.letter.design.template !== "modern")) ||
    source.cv.design.template !== "modern" ||
    source.settings.cvLayout !== "sidebar"
  )
    throw new DocxDownloadError(
      cvOnly
        ? "Der CV-Word-Download unterstützt momentan die Vorlage «Modern» mit seitlicher Spalte."
        : "Der Word-Download unterstützt momentan die Vorlage «Modern» mit seitlicher Spalte im Lebenslauf.",
    );
  if (
    source.cv.design.font !== "sans" ||
    (!cvOnly && (source.letter.design.fontOverride ?? source.letter.design.font) !== "sans")
  )
    throw new DocxDownloadError(
      cvOnly
        ? "Bitte im Lebenslauf die Schrift «Sans» wählen."
        : "Bitte in Brief und Lebenslauf die Schrift «Sans» wählen.",
    );
  const letterIssue = cvOnly ? null : sourceLetterFlowInputIssue(source);
  if (letterIssue)
    throw new DocxDownloadError(
      letterIssue === "rich-text"
        ? "Der Word-Download unterstützt formatierten Brieftext noch nicht. Bitte verwende den PDF-Download."
        : "Diese Brief-Einstellungen sind im Word-Download noch nicht unterstützt. Bitte verwende den PDF-Download.",
    );
  const chrome = resolveDossierChromeSnapshot(
    source,
    source.settings.chrome ?? DEFAULT_DOSSIER_CHROME_STATE,
  );
  if (
    (cvOnly ? [chrome.cv] : [chrome.letter, chrome.cv]).some(
      ({ options }) => options.headerMode !== "contact" || options.footerMode !== "compact",
    )
  )
    throw new DocxDownloadError(
      cvOnly
        ? "Bitte im Lebenslauf eine Kopfzeile mit Kontaktdaten und eine kompakte Fusszeile wählen."
        : "Bitte in Brief und Lebenslauf eine Kopfzeile mit Kontaktdaten und eine kompakte Fusszeile wählen.",
    );
}

export function captureSavedAppDocxNextSource(part?: DocumentPart["id"]): DossierAppSnapshot {
  const cv = cvPdfDocumentFromSaved(readStoredDossierPart(CV_STORAGE_KEY));
  if (part === "cv" && (!cv || !cvPdfHasContent(cv.data)))
    throw new DocxDownloadError("Bitte zuerst den Lebenslauf ausfüllen.");
  // Empty containers carry no user content and are never rendered or saved.
  // Available shared contact/colour settings remain part of the CV snapshot.
  const readContext = <T>(read: () => T): T | null => {
    try {
      return read();
    } catch (error) {
      if (part === "cv") return null;
      throw error;
    }
  };
  const cover =
    readContext(() => coverPdfDocumentFromSaved(readStoredDossierPart(COVER_STORAGE_KEY))) ??
    (part === "cv"
      ? coverPdfDocumentFromSaved({ template: cv!.design.template, data: {}, font: "sans" })
      : null);
  const letter =
    readContext(() => letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY))) ??
    (part === "cv"
      ? letterPdfDocumentFromSaved({
          data: {},
          design: { template: cv!.design.template, font: "sans" },
        })
      : null);
  if (
    !cover ||
    !letter ||
    !cv ||
    (part !== "cv" &&
      (!coverPdfHasContent(cover.data) ||
        !cvPdfHasContent(cv.data) ||
        !letterReadiness(letter.data).readyToSend))
  )
    throw new DocxDownloadError(
      "Bitte zuerst Titelblatt, Motivationsschreiben und Lebenslauf vollständig ausfüllen.",
    );
  const source = captureDossierDocxNextSnapshot(
    cover,
    letter,
    cv,
    {},
    part === "cv" ? "cv" : undefined,
  );
  assertAppDocxNextSource(source, part);
  return source;
}

export function savedAppDocxNextAvailability(part?: DocumentPart["id"]): {
  available: boolean;
  reason: string;
} {
  try {
    captureSavedAppDocxNextSource(part);
    return { available: true, reason: "Bereit" };
  } catch (error) {
    return {
      available: false,
      reason: docxDownloadErrorMessage(error),
    };
  }
}
