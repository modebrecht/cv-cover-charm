import { useCallback, useEffect, useRef, useState } from "react";
import type { FontKey } from "@/components/cover/types";
import {
  dossierFontFromSerialized,
  propagateDossierFontFrom,
  reconcileStoredDossierFonts,
} from "@/lib/dossier-font-sync";

// Before either editor hydrates, make existing CV/letter drafts agree on one
// concrete dossier font. CV wins only for an already conflicting legacy pair.
if (typeof window !== "undefined") reconcileStoredDossierFonts();

/**
 * Automatisches Sichern nur, solange das Fenster wirklich benutzt wird.
 *
 * Titelblatt und Lebenslauf liegen im selben Browser-Speicher. Steht das
 * Titelblatt in einem zweiten Tab offen, während im ersten der Lebenslauf
 * bearbeitet wird, würde der schlafende Tab weiter seinen alten Stand
 * darüberschreiben. Darum pausiert das Sichern, sobald der Tab in den
 * Hintergrund geht – und beim Zurückkommen wird geprüft, ob inzwischen jemand
 * anderes geschrieben hat.
 */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Sichtbarkeit deckt den zweiten Tab ab, der Fokus zwei nebeneinander
    // offene Fenster. Pausieren ist immer unbedenklich: sobald das Fenster
    // zurückkommt, wird ohnehin wieder gesichert.
    const read = () => setVisible(document.visibilityState === "visible" && document.hasFocus());
    read();
    document.addEventListener("visibilitychange", read);
    window.addEventListener("focus", read);
    window.addEventListener("blur", read);
    return () => {
      document.removeEventListener("visibilitychange", read);
      window.removeEventListener("focus", read);
      window.removeEventListener("blur", read);
    };
  }, []);

  return visible;
}

/**
 * Merkt sich, was zuletzt selbst geschrieben wurde, und meldet, wenn im
 * Speicher etwas anderes steht – dann hat ein anderer Tab gearbeitet.
 */
export function useForeignWrite(storageKey: string) {
  const lastWritten = useRef<string | null>(null);
  const lastFont = useRef<FontKey | null | undefined>(undefined);
  const suppressFirstNormalizedFont = useRef(false);

  /** Nach jedem eigenen Schreibvorgang aufrufen. */
  const markWritten = useCallback(
    (text: string) => {
      const font = dossierFontFromSerialized(text);
      const previousFont = lastFont.current;
      const firstObservation = previousFont === undefined;

      lastWritten.current = text;
      lastFont.current = font;

      // The first observation is hydration. If that stored draft has no
      // concrete font, the editor may normalize it to its visual default on
      // the first autosave (e.g. letter {} -> sans). That one normalization is
      // not a user choice and must not rewrite the sibling document.
      if (firstObservation) {
        suppressFirstNormalizedFont.current = font === null;
        return;
      }

      if (suppressFirstNormalizedFont.current && previousFont === null && font) {
        suppressFirstNormalizedFont.current = false;
        return;
      }
      suppressFirstNormalizedFont.current = false;

      if (font && font !== previousFont) propagateDossierFontFrom(storageKey, text);
    },
    [storageKey],
  );

  /**
   * Hat ein anderer Tab den Schlüssel verändert? Vor dem ersten eigenen
   * Schreiben gibt es nichts zu vergleichen – dann `false`.
   */
  const changedElsewhere = useCallback((): boolean => {
    if (lastWritten.current === null) return false;
    try {
      return localStorage.getItem(storageKey) !== lastWritten.current;
    } catch {
      return false;
    }
  }, [storageKey]);

  return { markWritten, changedElsewhere };
}
