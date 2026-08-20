export type CvPhotoShape = "rect" | "square" | "portrait" | "circle";

export const CV_PHOTO_SHAPES: Array<{ id: CvPhotoShape; label: string }> = [
  { id: "rect", label: "Rechteck" },
  { id: "square", label: "Quadrat" },
  { id: "portrait", label: "Hochportrait" },
  { id: "circle", label: "Kreis" },
];

const STORAGE_KEY = "lebenslauf:photo-shape:v1";
const EVENT = "lebenslauf-photo-shape-change";

let cached: CvPhotoShape | null = null;

function valid(value: string | null): value is CvPhotoShape {
  return value === "rect" || value === "square" || value === "portrait" || value === "circle";
}

function read(): CvPhotoShape {
  if (typeof window === "undefined") return "portrait";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return valid(value) ? value : "portrait";
  } catch {
    return "portrait";
  }
}

function apply(shape: CvPhotoShape) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.cvPhotoShape = shape;
}

export function getCvPhotoShape(): CvPhotoShape {
  if (!cached) cached = read();
  apply(cached);
  return cached;
}

export function setCvPhotoShape(shape: CvPhotoShape) {
  cached = shape;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, shape);
    } catch {
      // Die laufende Seite reagiert trotzdem über das Event.
    }
    apply(shape);
    window.dispatchEvent(new CustomEvent<CvPhotoShape>(EVENT, { detail: shape }));
  }
}

export function subscribeCvPhotoShape(onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const local = () => onChange();
  const storage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
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
