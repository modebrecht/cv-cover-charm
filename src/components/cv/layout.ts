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
    description: "Seitenspalte plus Hauptspalte, Breite einstellbar",
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
    id: "editorial",
    name: "Magazin",
    description: "Asymmetrisches Print-Raster",
  },
];

const STORAGE_KEY = "lebenslauf:layout:v1";
const MIRROR_STORAGE_KEY = "lebenslauf:layout-mirror:v1";
export const CV_LAYOUT_EVENT = "lebenslauf-layout-change";
const DEFAULT_LAYOUT: CvLayoutId = "classic";

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

/**
 * A template may have one natural starting structure without taking the choice
 * away from the user. Kolumne is built around a real side column, so a fresh
 * document starts in Sidebar.
 */
export function defaultCvLayoutForTemplate(template?: string | null): CvLayoutId {
  return template === "terracotta" ? "modern" : DEFAULT_LAYOUT;
}

/**
 * Kolumne is the one template whose identity depends on the sidebar actually
 * carrying content. A global layout choice persisted from another template
 * must not turn its 70 mm rail into an empty decorative slab. Treat Sidebar as
 * part of the template contract; other templates keep the user's saved choice.
 */
export function resolveCvLayoutChoice(
  template: string | null | undefined,
  saved: string | null,
): CvLayoutId {
  if (template === "terracotta") return "modern";
  const fallback = defaultCvLayoutForTemplate(template);
  return valid(saved) ? saved : fallback;
}

function readChoice(): CvLayoutId {
  const template =
    typeof document === "undefined" ? null : document.documentElement.dataset.dossierTemplate;
  if (typeof window === "undefined") return resolveCvLayoutChoice(template, null);
  try {
    return resolveCvLayoutChoice(template, window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return resolveCvLayoutChoice(template, null);
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

/**
 * "Zweispaltig" war dasselbe Raster wie "Sidebar" und unterschied sich nur in
 * Polsterung und Spaltenbreite – zwei Karten für einen Aufbau. Geblieben ist
 * "Sidebar", dessen Breite jetzt einstellbar ist. Ältere Stände, die noch
 * "executive" gespeichert haben, lesen sich als "Sidebar".
 */
function canonical(choice: CvLayoutId): CvLayoutId {
  return choice === "executive" ? "modern" : choice;
}

function applyVariant(choice: CvLayoutId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.cvVariant = canonical(choice);
  document.documentElement.dataset.cvMirrored = readMirror() ? "true" : "false";
}

/** Tatsächlich ausgewählte Karte im Aufbau-Picker. */
export function getCvLayoutChoice(): CvLayoutId {
  const choice = canonical(readChoice());
  applyVariant(choice);
  return choice;
}

/** Renderer-Modus für Canvas/Formular. */
export function getCvLayout(): CvRenderLayoutId {
  const choice = canonical(readChoice());
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
  applyVariant(readChoice());
  window.dispatchEvent(new CustomEvent<CvLayoutId>(CV_LAYOUT_EVENT, { detail: layout }));
}

export function setCvLayoutMirror(mirrored: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MIRROR_STORAGE_KEY, mirrored ? "true" : "false");
  } catch {
    // Die laufende Seite reagiert trotzdem über das Event.
  }
  applyVariant(readChoice());
  window.dispatchEvent(new CustomEvent(CV_LAYOUT_EVENT));
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
  window.addEventListener(CV_LAYOUT_EVENT, local);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(CV_LAYOUT_EVENT, local);
    window.removeEventListener("storage", storage);
  };
}

/** Gleicher Event-Stream, aber mit dem rohen Aufbauwert als Snapshot. */
export const subscribeCvLayoutChoice = subscribeCvLayout;
