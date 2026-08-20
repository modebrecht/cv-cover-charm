import {
  DEFAULT_DOSSIER_PHOTO_STYLE,
  normalizeDossierPhotoStyle,
  type DossierPhotoShape,
  type DossierPhotoStyle,
} from "@/lib/dossier-photo";

const STORAGE_KEY = "lebenslauf:photo:v2";
const LEGACY_SHAPE_KEY = "lebenslauf:photo-shape:v1";
const EVENT = "lebenslauf-photo-change";

let cached: DossierPhotoStyle | null = null;

function read(): DossierPhotoStyle {
  if (typeof window === "undefined") return DEFAULT_DOSSIER_PHOTO_STYLE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeDossierPhotoStyle(JSON.parse(raw) as Partial<DossierPhotoStyle>);

    // M5.3 migration: retain the shape selected in the old shape-only setting.
    const legacy = window.localStorage.getItem(LEGACY_SHAPE_KEY) as DossierPhotoShape | null;
    return normalizeDossierPhotoStyle({ shape: legacy ?? undefined });
  } catch {
    return DEFAULT_DOSSIER_PHOTO_STYLE;
  }
}

function apply(style: DossierPhotoStyle) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.cvPhotoShape = style.shape;
  root.style.setProperty("--cv-photo-zoom", String(style.zoom));
  root.style.setProperty("--cv-photo-width", `${style.zoom * 100}%`);
  root.style.setProperty("--cv-photo-height", `${style.zoom * 100}%`);
  root.style.setProperty("--cv-photo-left", `${-(style.zoom - 1) * style.x}%`);
  root.style.setProperty("--cv-photo-top", `${-(style.zoom - 1) * style.y}%`);
  root.style.setProperty("--cv-photo-border-width", `${style.borderWidth}mm`);
}

export function getCvPhotoStyle(): DossierPhotoStyle {
  if (!cached) cached = read();
  apply(cached);
  return cached;
}

export function setCvPhotoStyle(patch: Partial<DossierPhotoStyle>) {
  const next = normalizeDossierPhotoStyle({ ...getCvPhotoStyle(), ...patch });
  cached = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Die laufende Seite reagiert trotzdem über das Event.
    }
    apply(next);
    window.dispatchEvent(new CustomEvent<DossierPhotoStyle>(EVENT, { detail: next }));
  }
}

export function subscribeCvPhotoStyle(onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const local = () => onChange();
  const storage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== LEGACY_SHAPE_KEY) return;
    cached = read();
    apply(cached);
    onChange();
  };

  window.addEventListener(EVENT, local);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, local);
    window.removeEventListener("storage", storage);
  };
}

// Compatibility helpers for code outside M5.3.
export type CvPhotoShape = DossierPhotoShape;
export const getCvPhotoShape = () => getCvPhotoStyle().shape;
export const setCvPhotoShape = (shape: DossierPhotoShape) => setCvPhotoStyle({ shape });
export const subscribeCvPhotoShape = subscribeCvPhotoStyle;
