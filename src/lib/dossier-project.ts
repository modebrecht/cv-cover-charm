import {
  applyPortableCvState,
  readPortableCvState,
  type PortableCvState,
} from "@/components/cv/portable-state";

export const COVER_STORAGE_KEY = "titelblatt:v3";
export const LETTER_STORAGE_KEY = "anschreiben:v1";
export const CV_STORAGE_KEY = "lebenslauf:v1";

export const DOSSIER_PROJECT_KIND = "cv-cover-charm-dossier";
/**
 * `letter` and the optional CV portable state are additive extensions of
 * version 1. Older project files therefore stay readable without migration.
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

const browserStorage = () => (typeof window === "undefined" ? null : window.localStorage);

/** Liest einen Teil des Dossiers, ohne einen beschädigten Browserstand weiterzugeben. */
export function readStoredDossierPart(storageKey: string): Record<string, unknown> | undefined {
  try {
    const storage = browserStorage();
    if (!storage) return undefined;
    const text = storage.getItem(storageKey);
    if (!text) return undefined;
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Ergänzt den CV nur dann um portable Sidecars, wenn dafür wirklich ein
 * persistierter Browserstand existiert. Default-only CVs bleiben dadurch exakt
 * im bisherigen Projektformat.
 */
function portableCv(cv?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!cv) return undefined;
  const portableState = readPortableCvState();
  return portableState ? { ...cv, portableState } : cv;
}

/**
 * Baut eine gemeinsame, portable Projektdatei aus Titelblatt, Anschreiben und
 * Lebenslauf.
 *
 * Titelblatt und CV rufen diese Funktion schon länger nur mit ihrem eigenen
 * aktuellen Stand auf. Damit deren bestehende Exportwege das neue Anschreiben
 * automatisch mitnehmen, wird ein nicht explizit übergebener Brief aus dem
 * Browser-Speicher ergänzt. Dasselbe gilt für die CV-Sidecars: sie werden nur
 * in der Dossier-Datei eingebettet, nicht in den bisherigen Einzel-Save gezwungen.
 */
export function createDossierProject(parts: {
  cover?: Record<string, unknown>;
  letter?: Record<string, unknown>;
  cv?: Record<string, unknown>;
}): DossierProject {
  const letter = parts.letter ?? readStoredDossierPart(LETTER_STORAGE_KEY);
  const cv = portableCv(parts.cv);
  return {
    kind: DOSSIER_PROJECT_KIND,
    version: DOSSIER_PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    ...(parts.cover ? { cover: parts.cover } : {}),
    ...(letter ? { letter } : {}),
    ...(cv ? { cv } : {}),
  };
}

/**
 * Erkennt das gemeinsame Format. `letter` und `cv.portableState` sind optional,
 * damit bestehende Version-1-Dateien unverändert weiter funktionieren.
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
 *
 * `portableState` gehört nicht in den alten `lebenslauf:v1`-Payload. Beim Import
 * wird es stattdessen über die bestehenden CV-Setter in seine Sidecar-Keys
 * zurückgespielt; so reagieren auch bereits geöffnete CV-Ansichten sofort.
 */
export function storeDossierProject(project: DossierProject): {
  cover: boolean;
  letter: boolean;
  cv: boolean;
} {
  const storage = browserStorage();
  if (!storage) return { cover: false, letter: false, cv: false };

  if (project.cover) storage.setItem(COVER_STORAGE_KEY, JSON.stringify(project.cover));
  if (project.letter) storage.setItem(LETTER_STORAGE_KEY, JSON.stringify(project.letter));
  if (project.cv) {
    const { portableState, ...cv } = project.cv;
    storage.setItem(CV_STORAGE_KEY, JSON.stringify(cv));
    if (isRecord(portableState)) applyPortableCvState(portableState as PortableCvState);
  }
  return { cover: !!project.cover, letter: !!project.letter, cv: !!project.cv };
}
