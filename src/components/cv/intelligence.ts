import type { ShapeKind, TemplateId } from "@/components/cover/types";
import { dossierNameScale } from "@/lib/dossier-theme";
import type { CvData } from "./types";
import type { CvLayoutId } from "./layout";

type TemplateMood = "quiet" | "balanced" | "bold";

export type CvVisualPolicy = {
  /** Tatsächlich verwendete Hintergrunddeckkraft nach Vorlagenkorrektur. */
  backgroundOpacity: number;
  /** Basisfaktor für zusätzlich übernommene Titelblatt-Formen. */
  shapeFactor: number;
  /** Weissabdeckung des Hauptbereichs im Modern-Layout. */
  modernMainWash: number;
  /** Deckkraft der leichten Sidebar-Tönung. */
  sidebarTint: number;
};

const BOLD_TEMPLATES = new Set<TemplateId>([
  "edel",
  "colorful",
  "blockig",
  "edelBlockig",
  "welle",
  "neon",
  "aurora",
  "verlauf",
]);

const QUIET_TEMPLATES = new Set<TemplateId>([
  "klassisch",
  "modern",
  "serioes",
  "pastell",
  "studio",
]);

function mood(template: TemplateId): TemplateMood {
  if (BOLD_TEMPLATES.has(template)) return "bold";
  if (QUIET_TEMPLATES.has(template)) return "quiet";
  return "balanced";
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Der Transparenzregler bleibt die Nutzerabsicht; M4 normalisiert nur extreme
 * Vorlagen. Kräftige/dunkle Titelblätter werden stärker beruhigt als ruhige.
 */
export function cvVisualPolicy(
  template: TemplateId,
  layout: CvLayoutId,
  requestedOpacity: number,
): CvVisualPolicy {
  const m = mood(template);
  const factor = m === "bold" ? 0.58 : m === "balanced" ? 0.78 : 1;
  const classicMax = m === "bold" ? 0.045 : m === "balanced" ? 0.055 : 0.065;
  const modernMax = m === "bold" ? 0.022 : m === "balanced" ? 0.028 : 0.034;
  const max = layout === "modern" ? modernMax : classicMax;
  const backgroundOpacity = clamp(requestedOpacity * factor, 0, max);

  return {
    backgroundOpacity,
    shapeFactor: m === "bold" ? 0.34 : m === "balanced" ? 0.48 : 0.62,
    modernMainWash: m === "bold" ? 0.975 : m === "balanced" ? 0.965 : 0.955,
    sidebarTint: m === "bold" ? 0.055 : m === "balanced" ? 0.07 : 0.085,
  };
}

/** Grosse Dekoformen werden automatisch stärker zurückgenommen. */
export function shapeSizeFactor(widthMm: number, shape?: ShapeKind): number {
  if (shape === "line") return 0.85;
  if (widthMm >= 90) return 0.28;
  if (widthMm >= 65) return 0.4;
  if (widthMm >= 42) return 0.58;
  if (widthMm >= 25) return 0.78;
  return 1;
}

/**
 * Lange Namen nutzen dieselbe Skalierung wie das Titelblatt. Nur die
 * Ausgangsgrösse unterscheidet sich wegen des verfügbaren Layout-Rasters.
 */
export function smartNameSize(name: string, layout: CvLayoutId): number {
  const base = layout === "modern" ? 30 : 27;
  return Math.round(base * dossierNameScale(name) * 2) / 2;
}

export type SidebarPlan = {
  compact: boolean;
  veryCompact: boolean;
  /** Bei sehr viel Inhalt kommen Stärken/Hobbys in die Hauptspalte statt abgeschnitten zu werden. */
  moveOptionalToMain: boolean;
};

/**
 * Grobe Inhaltsdichte statt DOM-Messung: stabil im Preview und PDF und billig
 * genug für jeden Tastendruck. Lange Texte zählen stärker als kurze Einträge.
 */
export function sidebarPlan(data: CvData): SidebarPlan {
  const languageScore = data.sprachen.reduce(
    (sum, s) => sum + 1.5 + (s.name.length + s.niveau.length) / 38,
    0,
  );
  const strengthScore = data.staerken.reduce((sum, v) => sum + 1 + v.length / 34, 0);
  const hobbyScore = data.hobbys.reduce((sum, v) => sum + 0.9 + v.length / 38, 0);
  const contactScore =
    [data.person.adresse, data.person.plzOrt, data.person.telefon, data.person.email]
      .filter(Boolean)
      .join("").length / 32 +
    (data.person.geburtsdatum ? 0.8 : 0) +
    (data.person.nationalitaet ? 0.6 : 0) +
    (data.person.foto ? 3.2 : 0);

  const score = languageScore + strengthScore + hobbyScore + contactScore;
  return {
    compact: score > 16,
    veryCompact: score > 22,
    moveOptionalToMain: score > 27,
  };
}

/** CSS-Alpha als zweistellige Hex-Komponente. */
export function alphaHex(alpha: number): string {
  return Math.round(clamp(alpha, 0, 1) * 255)
    .toString(16)
    .padStart(2, "0");
}
