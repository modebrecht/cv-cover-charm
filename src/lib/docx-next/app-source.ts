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

/** The reviewed application composition, independently of the older URL-only trials. */
export function assertAppDocxNextSource(source: DossierAppSnapshot): void {
  if (
    source.cover.template !== "modern" ||
    source.letter.design.template !== "modern" ||
    source.cv.design.template !== "modern" ||
    source.settings.cvLayout !== "sidebar"
  )
    throw Error("DOCX Next ist derzeit für Modern mit Sidebar im Lebenslauf verfügbar.");
  if (
    source.cv.design.font !== "sans" ||
    (source.letter.design.fontOverride ?? source.letter.design.font) !== "sans"
  )
    throw Error("Für diese DOCX-Next-Ausgabe bitte Sans in Brief und Lebenslauf wählen.");
  const chrome = resolveDossierChromeSnapshot(
    source,
    source.settings.chrome ?? DEFAULT_DOSSIER_CHROME_STATE,
  );
  if (
    [chrome.letter, chrome.cv].some(
      ({ options }) => options.headerMode !== "contact" || options.footerMode !== "compact",
    )
  )
    throw Error(
      "DOCX Next benötigt derzeit Kontaktkopfzeilen und kompakte Fusszeilen in Brief und CV.",
    );
}

export function captureSavedAppDocxNextSource(): DossierAppSnapshot {
  const cover = coverPdfDocumentFromSaved(readStoredDossierPart(COVER_STORAGE_KEY));
  const letter = letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY));
  const cv = cvPdfDocumentFromSaved(readStoredDossierPart(CV_STORAGE_KEY));
  if (
    !cover ||
    !letter ||
    !cv ||
    !coverPdfHasContent(cover.data) ||
    !cvPdfHasContent(cv.data) ||
    !letterReadiness(letter.data).readyToSend
  )
    throw Error(
      "Bitte zuerst Titelblatt, Motivationsschreiben und Lebenslauf vollständig ausfüllen.",
    );
  const source = captureDossierDocxNextSnapshot(cover, letter, cv);
  assertAppDocxNextSource(source);
  return source;
}

export function savedAppDocxNextAvailability(): { available: boolean; reason: string } {
  try {
    captureSavedAppDocxNextSource();
    return { available: true, reason: "Modern mit Sidebar · frei bewegliches CV-Foto" };
  } catch (error) {
    return {
      available: false,
      reason:
        error instanceof Error
          ? error.message
          : "DOCX Next ist für diesen Entwurf nicht verfügbar.",
    };
  }
}
