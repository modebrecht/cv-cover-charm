import { useMemo } from "react";
import type { DossierChromeScope, DossierChromeState } from "./dossier-chrome";
import { LETTER_STORAGE_KEY, CV_STORAGE_KEY, readStoredDossierPart } from "./dossier-project";
import { letterPdfDocumentFromSaved, cvPdfDocumentFromSaved } from "./dossier-pdf-document";
import { resolveSynchronizedContactChrome } from "./dossier-chrome-contact-sync";

/** Editors supply their live design; the other saved design is read without
 * mutating state. The pure export resolver uses the same colour policy. */
export function useSynchronizedContactChrome(
  scope: DossierChromeScope,
  design: { template: string; colors: Record<string, string> },
  state: DossierChromeState,
) {
  const otherDesign =
    scope === "letter"
      ? cvPdfDocumentFromSaved(readStoredDossierPart(CV_STORAGE_KEY))?.design
      : letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY))?.design;
  const savedDesign = JSON.stringify(otherDesign ?? null);
  return useMemo(
    () =>
      resolveSynchronizedContactChrome(
        {
          letter: scope === "letter" ? design : JSON.parse(savedDesign),
          cv: scope === "cv" ? design : JSON.parse(savedDesign),
        },
        state,
        scope,
      ),
    [scope, design, state, savedDesign],
  );
}
