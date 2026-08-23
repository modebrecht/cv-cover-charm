export const COVER_STORAGE_KEY = "titelblatt:v3";
export const CV_STORAGE_KEY = "lebenslauf:v1";

export const DOSSIER_PROJECT_KIND = "cv-cover-charm-dossier";
export const DOSSIER_PROJECT_VERSION = 1;

export type DossierProject = {
  kind: typeof DOSSIER_PROJECT_KIND;
  version: typeof DOSSIER_PROJECT_VERSION;
  savedAt: string;
  cover?: Record<string, unknown>;
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

/** Baut eine gemeinsame, portable Projektdatei aus Titelblatt und Lebenslauf. */
export function createDossierProject(parts: {
  cover?: Record<string, unknown>;
  cv?: Record<string, unknown>;
}): DossierProject {
  return {
    kind: DOSSIER_PROJECT_KIND,
    version: DOSSIER_PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    ...(parts.cover ? { cover: parts.cover } : {}),
    ...(parts.cv ? { cv: parts.cv } : {}),
  };
}

/** Erkennt nur das gemeinsame Format; alte Einzeldateien behandeln die Editoren separat. */
export function parseDossierProject(value: unknown): DossierProject | null {
  if (!isRecord(value)) return null;
  if (value.kind !== DOSSIER_PROJECT_KIND || value.version !== DOSSIER_PROJECT_VERSION) return null;

  const cover = isRecord(value.cover) && isRecord(value.cover.data) ? value.cover : undefined;
  const cv = isRecord(value.cv) && isRecord(value.cv.data) ? value.cv : undefined;
  if (!cover && !cv) return null;

  return {
    kind: DOSSIER_PROJECT_KIND,
    version: DOSSIER_PROJECT_VERSION,
    savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date(0).toISOString(),
    ...(cover ? { cover } : {}),
    ...(cv ? { cv } : {}),
  };
}

/** Schreibt beide Teile zusammen zurück. Fehlende Teile bleiben bewusst unangetastet. */
export function storeDossierProject(project: DossierProject): {
  cover: boolean;
  cv: boolean;
} {
  if (project.cover) localStorage.setItem(COVER_STORAGE_KEY, JSON.stringify(project.cover));
  if (project.cv) localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(project.cv));
  return { cover: !!project.cover, cv: !!project.cv };
}
