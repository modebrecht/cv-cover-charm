import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { DossierChromeScope, DossierChromeState } from "./dossier-chrome";
import { LETTER_STORAGE_KEY, CV_STORAGE_KEY, readStoredDossierPart } from "./dossier-project";
import { letterPdfDocumentFromSaved, cvPdfDocumentFromSaved } from "./dossier-pdf-document";
import { resolveDossierChromePalette } from "./dossier-chrome-palette";

const serverDesign = () => "null";
function subscribeSavedDesign(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === LETTER_STORAGE_KEY || event.key === CV_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/** Editors supply their live design; the other saved design is read without
 * mutating state. The pure export resolver uses the same colour policy. */
export function useDossierChromePalette(
  scope: DossierChromeScope,
  design: { template: string; colors: Record<string, string> },
  state: DossierChromeState,
) {
  const readSavedDesign = useCallback(() => {
    const otherDesign =
      scope === "letter"
        ? cvPdfDocumentFromSaved(readStoredDossierPart(CV_STORAGE_KEY))?.design
        : letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY))?.design;
    return JSON.stringify(otherDesign ?? null);
  }, [scope]);
  // Hydration must see the same palette as SSR. Reading storage directly during
  // the first render leaves stale SSR colours on page 1; later pages mount fresh.
  const savedDesign = useSyncExternalStore(subscribeSavedDesign, readSavedDesign, serverDesign);
  return useMemo(
    () =>
      resolveDossierChromePalette(
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
