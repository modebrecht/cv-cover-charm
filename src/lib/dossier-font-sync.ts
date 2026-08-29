import { FONT_LABELS, type FontKey } from "@/components/cover/types";
import { CV_STORAGE_KEY, LETTER_STORAGE_KEY } from "@/lib/dossier-project";

type RecordLike = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordLike =>
  !!value && typeof value === "object" && !Array.isArray(value);

function validFont(value: unknown): FontKey | null {
  return typeof value === "string" && value in FONT_LABELS ? (value as FontKey) : null;
}

function parseSaved(text: string | null): RecordLike | null {
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function dossierFontFromSerialized(text: string | null): FontKey | null {
  const saved = parseSaved(text);
  const design = saved && isRecord(saved.design) ? saved.design : null;
  return validFont(design?.font);
}

function withFont(text: string | null, storageKey: string, font: FontKey): string | null {
  const saved = parseSaved(text);
  if (!saved && text) return null;

  const base: RecordLike = saved ?? {
    version: storageKey === CV_STORAGE_KEY ? 6 : 1,
  };
  const design = isRecord(base.design) ? base.design : {};
  if (validFont(design.font) === font) return text ?? JSON.stringify(base);

  return JSON.stringify({
    ...base,
    design: {
      ...design,
      font,
    },
  });
}

export type ReconciledDossierFonts = {
  font: FontKey | null;
  cv: string | null;
  letter: string | null;
};

/**
 * CV is the initial tie-breaker because its UI already labels the setting
 * "Schriftart gesamtes Dossier". If only one document has a concrete font,
 * that font is copied to the other document. Existing content is preserved.
 */
export function reconcileDossierFontTexts(
  cvText: string | null,
  letterText: string | null,
): ReconciledDossierFonts {
  const cvFont = dossierFontFromSerialized(cvText);
  const letterFont = dossierFontFromSerialized(letterText);
  const font = cvFont ?? letterFont;
  if (!font) return { font: null, cv: cvText, letter: letterText };

  return {
    font,
    cv: withFont(cvText, CV_STORAGE_KEY, font) ?? cvText,
    letter: withFont(letterText, LETTER_STORAGE_KEY, font) ?? letterText,
  };
}

export function reconcileStoredDossierFonts(): FontKey | null {
  if (typeof window === "undefined") return null;
  try {
    const currentCv = window.localStorage.getItem(CV_STORAGE_KEY);
    const currentLetter = window.localStorage.getItem(LETTER_STORAGE_KEY);
    const reconciled = reconcileDossierFontTexts(currentCv, currentLetter);

    if (reconciled.cv !== null && reconciled.cv !== currentCv) {
      window.localStorage.setItem(CV_STORAGE_KEY, reconciled.cv);
    }
    if (reconciled.letter !== null && reconciled.letter !== currentLetter) {
      window.localStorage.setItem(LETTER_STORAGE_KEY, reconciled.letter);
    }
    return reconciled.font;
  } catch {
    return null;
  }
}

/**
 * After the initial reconciliation, a concrete font change in either editor
 * becomes the new shared dossier font and is written into the other document.
 */
export function propagateDossierFontFrom(storageKey: string, serialized: string): void {
  if (typeof window === "undefined") return;
  if (storageKey !== CV_STORAGE_KEY && storageKey !== LETTER_STORAGE_KEY) return;

  const font = dossierFontFromSerialized(serialized);
  if (!font) return;

  const targetKey = storageKey === CV_STORAGE_KEY ? LETTER_STORAGE_KEY : CV_STORAGE_KEY;
  try {
    const current = window.localStorage.getItem(targetKey);
    const next = withFont(current, targetKey, font);
    if (next !== null && next !== current) window.localStorage.setItem(targetKey, next);
  } catch {
    // Storage can be blocked or malformed; autosave itself must remain usable.
  }
}
