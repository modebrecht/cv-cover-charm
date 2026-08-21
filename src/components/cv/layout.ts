export type CvLayoutId = "classic" | "modern" | "minimal" | "timeline" | "executive" | "editorial";
export type CvRenderLayoutId = "classic" | "modern";

/**
 * Internal IDs intentionally stay unchanged for localStorage/backwards compatibility.
 * Visible names describe structure only, so they cannot be confused with dossier styles.
 */
export const CV_LAYOUTS: Array<{
  id: CvLayoutId;
  name: string;
  description: string;
}> = [
  {
    id: "classic",
    name: "Standard",
    description: "Klares einspaltiges Grundraster",
  },
  {
    id: "modern",
    name: "Sidebar",
    description: "Schmale Seitenleiste plus Hauptspalte",
  },
  {
    id: "minimal",
    name: "Luftig",
    description: "Einspaltig mit besonders viel Weissraum",
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Chronologie entlang einer vertikalen Achse",
  },
  {
    id: "executive",
    name: "Zweispaltig",
    description: "Breiter Zweispalter mit Seitenleiste",
  },
  {
    id: "editorial",
    name: "Magazin",
    description: "Asymmetrisches Print-Raster",
  },
];

const STORAGE_KEY = "lebenslauf:layout:v1";
const MIRROR_STORAGE_KEY = "lebenslauf:layout-mirror:v1";
const EVENT = "lebenslauf-layout-change";

function valid(value: string | null): value is CvLayoutId {
  return (
    value === "classic" ||
    value === "modern" ||
    value === "minimal" ||
    value === "timeline" ||
    value === "executive" ||
    value === "editorial"
  );
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

function readMirror(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MIRROR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function rendererFor(choice: CvLayoutId): CvRenderLayoutId {
  // M5.6: diese Zuordnung entscheidet nur die Inhaltsgeometrie. Die visuelle
  // DNA (Typografie, Linien, Intensität, Radien) kommt aus DossierTheme.
  return choice === "modern" || choice === "executive" ? "modern" : "classic";
}

function applyVariant(choice: CvLayoutId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.cvVariant = choice;
  document.documentElement.dataset.cvMirrored = readMirror() ? "true" : "false";
}

/** Tatsächlich ausgewählte Karte im Aufbau-Picker. */
export function getCvLayoutChoice(): CvLayoutId {
  const choice = readChoice();
  applyVariant(choice);
  return choice;
}

/** Renderer-Modus für Canvas/Formular. */
export function getCvLayout(): CvRenderLayoutId {
  const choice = readChoice();
  applyVariant(choice);
  return rendererFor(choice);
}

/** Zweispalten-Aufbauten starten immer normal: Sidebar links, Main rechts. */
export function getCvLayoutMirror(): boolean {
  return readMirror();
}

export function setCvLayout(layout: CvLayoutId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, layout);
  } catch {
    // Aufbauwahl funktioniert für die laufende Seite trotzdem über das Event.
  }
  applyVariant(layout);
  window.dispatchEvent(new CustomEvent<CvLayoutId>(EVENT, { detail: layout }));
}

export function setCvLayoutMirror(mirrored: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MIRROR_STORAGE_KEY, mirrored ? "true" : "false");
  } catch {
    // Die laufende Seite reagiert trotzdem über das Event.
  }
  applyVariant(readChoice());
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeCvLayout(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const local = () => onChange();
  const storage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === MIRROR_STORAGE_KEY) {
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

/** Gleicher Event-Stream, aber mit dem rohen Aufbauwert als Snapshot. */
export const subscribeCvLayoutChoice = subscribeCvLayout;
