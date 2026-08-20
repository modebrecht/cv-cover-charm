export type CvLayoutId = "classic" | "modern" | "minimal" | "timeline";
export type CvRenderLayoutId = "classic" | "modern";

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
  {
    id: "minimal",
    name: "Minimal",
    description: "Viel Weissraum, ruhig und elegant",
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Vertikale Linie mit klarer Chronologie",
  },
];

const STORAGE_KEY = "lebenslauf:layout:v1";
const EVENT = "lebenslauf-layout-change";

function valid(value: string | null): value is CvLayoutId {
  return value === "classic" || value === "modern" || value === "minimal" || value === "timeline";
}

function readChoice(): CvLayoutId {
  if (typeof window === "undefined") return "classic";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return valid(value) ? value : "classic";
  } catch {
    return "classic";
  }
}

function rendererFor(choice: CvLayoutId): CvRenderLayoutId {
  // Minimal und Timeline verwenden bewusst die robuste einspaltige
  // Inhaltslogik von Classic. Die visuelle Variante wird per CSS gestaltet.
  return choice === "modern" ? "modern" : "classic";
}

function applyVariant(choice: CvLayoutId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.cvVariant = choice;
}

/** Tatsächlich ausgewählte Karte im Layout-Picker. */
export function getCvLayoutChoice(): CvLayoutId {
  const choice = readChoice();
  applyVariant(choice);
  return choice;
}

/** Renderer-Modus für Canvas/Formular. Minimal + Timeline bleiben einspaltig. */
export function getCvLayout(): CvRenderLayoutId {
  const choice = readChoice();
  applyVariant(choice);
  return rendererFor(choice);
}

export function setCvLayout(layout: CvLayoutId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, layout);
  } catch {
    // Layoutwahl funktioniert für die laufende Seite trotzdem über das Event.
  }
  applyVariant(layout);
  window.dispatchEvent(new CustomEvent<CvLayoutId>(EVENT, { detail: layout }));
}

export function subscribeCvLayout(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const local = () => onChange();
  const storage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      applyVariant(readChoice());
      onChange();
    }
  };
  window.addEventListener(EVENT, local);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, local);
    window.removeEventListener("storage", storage);
  };
}

/** Gleicher Event-Stream, aber mit dem rohen Vierer-Layoutwert als Snapshot. */
export const subscribeCvLayoutChoice = subscribeCvLayout;
