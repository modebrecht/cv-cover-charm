import { lineText } from "@/components/cover/types";
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
  const includes = (id: DocumentPart["id"]) => !part || part === id;
  if (
    (includes("cover") && source.cover.template !== "modern") ||
    (includes("letter") && source.letter.design.template !== "modern") ||
    (includes("cv") &&
      (source.cv.design.template !== "modern" || source.settings.cvLayout !== "sidebar"))
  )
    throw new DocxDownloadError(
      part === "cover"
        ? "Der Titelblatt-Word-Download unterstützt momentan die Vorlage «Modern»."
        : part === "letter"
          ? "Der Brief-Word-Download unterstützt momentan die Vorlage «Modern»."
          : part === "cv"
            ? "Der CV-Word-Download unterstützt momentan die Vorlage «Modern» mit seitlicher Spalte."
            : "Der Word-Download unterstützt momentan die Vorlage «Modern» mit seitlicher Spalte im Lebenslauf.",
    );
  if (
    (includes("cv") && source.cv.design.font !== "sans") ||
    (includes("letter") &&
      (source.letter.design.fontOverride ?? source.letter.design.font) !== "sans")
  )
    throw new DocxDownloadError(
      part === "cv"
        ? "Bitte im Lebenslauf die Schrift «Sans» wählen."
        : part === "letter"
          ? "Bitte im Brief die Schrift «Sans» wählen."
          : "Bitte in Brief und Lebenslauf die Schrift «Sans» wählen.",
    );
  if (
    part === "cover" &&
    source.cover.blocks.some(
      (block) =>
        !block.style.hidden &&
        (!["empfaenger", "anTitel"].includes(block.id) ||
          source.cover.data.showBetriebOnCover !== false) &&
        (!["beilagen", "beilagenTitel"].includes(block.id) ||
          source.cover.data.showBeilagenOnCover !== false) &&
        ((block.kind === "text" && block.lines.some((line) => lineText(line).trim())) ||
          (block.kind === "photo" && !source.cover.data.foto)) &&
        block.style.font !== "sans",
    )
  )
    throw new DocxDownloadError("Bitte auf dem Titelblatt die Schrift «Sans» wählen.");
  const letterIssue = includes("letter") ? sourceLetterFlowInputIssue(source) : null;
  if (letterIssue)
    throw new DocxDownloadError(
      letterIssue === "rich-text"
        ? "Der Word-Download unterstützt formatierten Brieftext noch nicht. Bitte verwende den PDF-Download."
        : "Diese Brief-Einstellungen sind im Word-Download noch nicht unterstützt. Bitte verwende den PDF-Download.",
    );
  if (part === "cover") return;
  const chrome = resolveDossierChromeSnapshot(
    source,
    source.settings.chrome ?? DEFAULT_DOSSIER_CHROME_STATE,
  );
  if (
    (part ? [chrome[part]] : [chrome.letter, chrome.cv]).some(
      ({ options }) => options.headerMode !== "contact" || options.footerMode !== "compact",
    )
  )
    throw new DocxDownloadError(
      part === "cv"
        ? "Bitte im Lebenslauf eine Kopfzeile mit Kontaktdaten und eine kompakte Fusszeile wählen."
        : part === "letter"
          ? "Bitte im Brief eine Kopfzeile mit Kontaktdaten und eine kompakte Fusszeile wählen."
          : "Bitte in Brief und Lebenslauf eine Kopfzeile mit Kontaktdaten und eine kompakte Fusszeile wählen.",
    );
}

export function captureSavedAppDocxNextSource(part?: DocumentPart["id"]): DossierAppSnapshot {
  // Optional documents can still supply the existing synchronized contact and
  // palette intent. Unreadable unrelated content is never rendered or saved.
  const read = <T>(id: DocumentPart["id"], capture: () => T): T | null => {
    try {
      return capture();
    } catch (error) {
      if (part && part !== id) return null;
      throw error;
    }
  };
  const cover = read("cover", () =>
    coverPdfDocumentFromSaved(readStoredDossierPart(COVER_STORAGE_KEY)),
  );
  const letter = read("letter", () =>
    letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY)),
  );
  const cv = read("cv", () => cvPdfDocumentFromSaved(readStoredDossierPart(CV_STORAGE_KEY)));
  const ready = {
    cover: !!cover && coverPdfHasContent(cover.data),
    letter: !!letter && letterReadiness(letter.data).readyToSend,
    cv: !!cv && cvPdfHasContent(cv.data),
  };
  if (part ? !ready[part] : !ready.cover || !ready.letter || !ready.cv)
    throw new DocxDownloadError(
      part === "cover"
        ? "Bitte zuerst das Titelblatt ausfüllen."
        : part === "letter"
          ? "Bitte zuerst das Motivationsschreiben vollständig ausfüllen."
          : part === "cv"
            ? "Bitte zuerst den Lebenslauf ausfüllen."
            : "Bitte zuerst Titelblatt, Motivationsschreiben und Lebenslauf vollständig ausfüllen.",
    );
  const source = captureDossierDocxNextSnapshot(
    cover ?? coverPdfDocumentFromSaved({ template: "modern", data: {}, font: "sans" })!,
    letter ??
      letterPdfDocumentFromSaved({ data: {}, design: { template: "modern", font: "sans" } })!,
    cv ?? cvPdfDocumentFromSaved({ data: {}, design: { template: "modern", font: "sans" } })!,
    {},
    part,
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
