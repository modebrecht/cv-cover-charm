export const COVER_STORAGE_KEY = "titelblatt:v3";
export const LETTER_STORAGE_KEY = "anschreiben:v1";
export const CV_STORAGE_KEY = "lebenslauf:v1";

export const DOSSIER_PROJECT_KIND = "cv-cover-charm-dossier";
/**
 * `letter` ist eine additive Erweiterung von Version 1. Alte Projektdateien mit
 * nur Titelblatt und Lebenslauf bleiben dadurch ohne Migration lesbar.
 */
export const DOSSIER_PROJECT_VERSION = 1;

export type DossierProject = {
  kind: typeof DOSSIER_PROJECT_KIND;
  version: typeof DOSSIER_PROJECT_VERSION;
  savedAt: string;
  cover?: Record<string, unknown>;
  letter?: Record<string, unknown>;
  cv?: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** Liest einen Teil des Dossiers, ohne einen beschädigten Browserstand weiterzugeben. */
export function readStoredDossierPart(storageKey: string): Record<string, unknown> | undefined {
  try {
    const text = localStorage.getItem(storageKey);
    if (!text) return undefined;
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Baut eine gemeinsame, portable Projektdatei aus Titelblatt, Anschreiben und
 * Lebenslauf.
 *
 * Titelblatt und CV rufen diese Funktion schon länger nur mit ihrem eigenen
 * aktuellen Stand auf. Damit deren bestehende Exportwege das neue Anschreiben
 * automatisch mitnehmen, wird ein nicht explizit übergebener Brief aus dem
 * Browser-Speicher ergänzt. Auf dem Server bzw. ohne gespeicherten Brief bleibt
 * der Teil schlicht weg.
 */
export function createDossierProject(parts: {
  cover?: Record<string, unknown>;
  letter?: Record<string, unknown>;
  cv?: Record<string, unknown>;
}): DossierProject {
  const letter = parts.letter ?? readStoredDossierPart(LETTER_STORAGE_KEY);
  return {
    kind: DOSSIER_PROJECT_KIND,
    version: DOSSIER_PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    ...(parts.cover ? { cover: parts.cover } : {}),
    ...(letter ? { letter } : {}),
    ...(parts.cv ? { cv: parts.cv } : {}),
  };
}

/**
 * Erkennt das gemeinsame Format. `letter` ist optional, damit bestehende
 * Version-1-Dateien mit nur `cover + cv` unverändert weiter funktionieren.
 * Alte Einzeldateien behandeln die Editoren weiterhin separat.
 */
export function parseDossierProject(value: unknown): DossierProject | null {
  if (!isRecord(value)) return null;
  if (value.kind !== DOSSIER_PROJECT_KIND || value.version !== DOSSIER_PROJECT_VERSION) return null;

  const cover = isRecord(value.cover) && isRecord(value.cover.data) ? value.cover : undefined;
  const letter = isRecord(value.letter) && isRecord(value.letter.data) ? value.letter : undefined;
  const cv = isRecord(value.cv) && isRecord(value.cv.data) ? value.cv : undefined;
  if (!cover && !letter && !cv) return null;

  return {
    kind: DOSSIER_PROJECT_KIND,
    version: DOSSIER_PROJECT_VERSION,
    savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date(0).toISOString(),
    ...(cover ? { cover } : {}),
    ...(letter ? { letter } : {}),
    ...(cv ? { cv } : {}),
  };
}

/**
 * Schreibt alle vorhandenen Teile zurück. Fehlende Teile bleiben bewusst
 * unangetastet, damit auch partielle bzw. ältere Projektdateien nichts löschen.
 */
export function storeDossierProject(project: DossierProject): {
  cover: boolean;
  letter: boolean;
  cv: boolean;
} {
  if (project.cover) localStorage.setItem(COVER_STORAGE_KEY, JSON.stringify(project.cover));
  if (project.letter) localStorage.setItem(LETTER_STORAGE_KEY, JSON.stringify(project.letter));
  if (project.cv) localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(project.cv));
  return { cover: !!project.cover, letter: !!project.letter, cv: !!project.cv };
}
