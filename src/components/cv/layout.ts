export type CvLayoutId = "classic" | "modern";

export const CV_LAYOUTS: Array<{
  id: CvLayoutId;
  name: string;
  description: string;
}> = [
  {
    id: "classic",
    name: "Klassisch",
    description: "Klare einspaltige Bewerbung",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Sidebar mit kompakter Hauptspalte",
  },
];

const STORAGE_KEY = "lebenslauf:layout:v1";
const EVENT = "lebenslauf-layout-change";

function valid(value: string | null): value is CvLayoutId {
  return value === "classic" || value === "modern";
}

export function getCvLayout(): CvLayoutId {
  if (typeof window === "undefined") return "classic";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return valid(value) ? value : "classic";
  } catch {
    return "classic";
  }
}

export function setCvLayout(layout: CvLayoutId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, layout);
  } catch {
    // Layoutwahl funktioniert für die laufende Seite trotzdem über das Event.
  }
  window.dispatchEvent(new CustomEvent<CvLayoutId>(EVENT, { detail: layout }));
}

export function subscribeCvLayout(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const local = () => onChange();
  const storage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(EVENT, local);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, local);
    window.removeEventListener("storage", storage);
  };
}
